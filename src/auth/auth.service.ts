import {
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as admin from 'firebase-admin';
import { JwksClient } from 'jwks-rsa';
import { UserAccount } from 'src/users/entities/account.entity';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { UserDeviceToken } from 'src/users/entities/user-device-token.entity';
import { AuditLogger } from './audit.logger';
import { Repository } from 'typeorm';

const ACCESS_TOKEN_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '90d';
const JWT_ALGORITHM: jwt.Algorithm = 'HS256';

const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  private googleOAuth2Client: OAuth2Client;
  private appleJwksClient: JwksClient;

  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private googleClientId: string;
  private googleAudiences: string[];
  private appleBundleId: string;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserAccount)
    private userAccountRepo: Repository<UserAccount>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(UserDeviceToken)
    private userDeviceTokenRepo: Repository<UserDeviceToken>,
    private configService: ConfigService,
    private auditLogger: AuditLogger,
  ) {
    this.accessTokenSecret = this.configService.getOrThrow<string>(
      'ACCESS_TOKEN_SECRET',
    );
    this.refreshTokenSecret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_SECRET',
    );
    this.googleClientId =
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.googleAudiences = [this.googleClientId];
    const androidClientId = this.configService.get<string>(
      'GOOGLE_ANDROID_CLIENT_ID',
    );
    const iosClientId = this.configService.get<string>('GOOGLE_IOS_CLIENT_ID');
    if (androidClientId) this.googleAudiences.push(androidClientId);
    if (iosClientId) this.googleAudiences.push(iosClientId);
    this.appleBundleId = this.configService.get<string>('APPLE_BUNDLE_ID', '');

    this.googleOAuth2Client = new OAuth2Client(this.googleClientId);
    this.appleJwksClient = new JwksClient({
      jwksUri: APPLE_JWKS_URI,
      cache: true,
      cacheMaxAge: 86400000,
    });
  }

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }

    if (this.accessTokenSecret.length < 32) {
      this.logger.warn(
        'ACCESS_TOKEN_SECRET is shorter than 32 characters. Use a stronger secret in production.',
      );
    }
    if (this.refreshTokenSecret.length < 32) {
      this.logger.warn(
        'REFRESH_TOKEN_SECRET is shorter than 32 characters. Use a stronger secret in production.',
      );
    }
  }

  async socialLogin(provider: string, idToken: string) {
    let userData: {
      username: string;
      name: string;
      email: string;
      photo: string | null;
    };

    // Verify token — log auth failure if verification throws
    try {
      if (provider === 'google') {
        userData = await this.verifyGoogleToken(idToken);
      } else if (provider === 'apple') {
        userData = await this.verifyAppleToken(idToken);
      } else {
        throw new HttpException('Unsupported provider', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.BAD_REQUEST
      ) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Token verification failed';
      try {
        await this.auditLogger.logAuthAttempt(
          'unknown',
          provider,
          'LOGIN_FAILED_AUTH',
          message,
          null,
        );
      } catch { /* audit failure must not surface to caller */ }
      throw error;
    }

    userData.email = userData.email.toLowerCase();

    let user = await this.userRepo.findOne({
      where: { email: userData.email },
    });

    if (!user) {
      const memberRole = await this.roleRepo.findOne({
        where: { slug: 'member' },
      });
      if (!memberRole) {
        throw new HttpException(
          'Member role not found in database',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      user = this.userRepo.create({
        name: userData.name,
        email: userData.email,
        picture: userData.photo ?? undefined,
        role: memberRole,
      });
      await this.userRepo.save(user);
    }

    // Role-based access check — admin only
    if (!user.role || user.role.slug !== 'admin') {
      const reason = `User role is '${user.role?.slug ?? 'unknown'}', not 'admin'`;
      try {
        await this.auditLogger.logAuthAttempt(
          userData.email,
          provider,
          'LOGIN_FAILED_ROLE',
          reason,
          null,
        );
      } catch { /* audit failure must not surface to caller */ }
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    const tokens = await this.issueTokens(user);

    try {
      await this.auditLogger.logAuthAttempt(
        userData.email,
        provider,
        'LOGIN_SUCCESS',
        null,
        null,
      );
    } catch { /* audit failure must not surface to caller */ }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role?.slug ?? null,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async issueTokens(user: User) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      this.accessTokenSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN, algorithm: JWT_ALGORITHM },
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      this.refreshTokenSecret,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN, algorithm: JWT_ALGORITHM },
    );

    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const hashedToken = this.hashToken(refreshToken);

    const account = this.userAccountRepo.create({
      refreshToken: hashedToken,
      user,
      expiresAt,
    });
    await this.userAccountRepo.save(account);

    return { accessToken, refreshToken };
  }

  async refreshTokens(oldRefreshToken: string) {
    try {
      jwt.verify(oldRefreshToken, this.refreshTokenSecret, {
        algorithms: [JWT_ALGORITHM],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const hashedToken = this.hashToken(oldRefreshToken);
    const account = await this.userAccountRepo.findOne({
      where: {
        refreshToken: hashedToken,
        isRevoked: false,
      },
      relations: ['user'],
    });

    if (!account || !account.user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (account.expiresAt && account.expiresAt < new Date()) {
      account.isRevoked = true;
      await this.userAccountRepo.save(account);
      throw new UnauthorizedException('Refresh token has expired');
    }

    account.isRevoked = true;
    await this.userAccountRepo.save(account);

    const user = account.user;
    const tokens = await this.issueTokens(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role?.slug ?? null,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string, userId: number, fcmToken?: string) {
    const hashedToken = this.hashToken(refreshToken);
    const tokenRecord = await this.userAccountRepo.findOne({
      where: {
        refreshToken: hashedToken,
        user: { id: userId },
        isRevoked: false,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Token not found or already revoked');
    }

    if (fcmToken) {
      await this.userDeviceTokenRepo.delete({
        token: fcmToken,
        user: { id: userId },
      });
    }

    tokenRecord.isRevoked = true;
    await this.userAccountRepo.save(tokenRecord);

    return { success: true };
  }

  private async verifyGoogleToken(idToken: string) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);

      if (!decoded.email) {
        throw new Error('Missing email in Firebase token payload');
      }

      return {
        username: decoded.uid,
        name:
          decoded.name || this.getUsernameFromEmail(decoded.email) || 'User',
        email: decoded.email,
        photo: decoded.picture || null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Google token verification failed: ${message}`);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async verifyAppleToken(idToken: string): Promise<{
    username: string;
    name: string;
    email: string;
    photo: string | null;
  }> {
    try {
      const decodedHeader = jwt.decode(idToken, { complete: true });
      if (!decodedHeader || !decodedHeader.header?.kid) {
        throw new Error('Unable to decode Apple token header');
      }

      const signingKey = await this.appleJwksClient.getSigningKey(
        decodedHeader.header.kid,
      );
      const publicKey = signingKey.getPublicKey();

      const verifyOptions: jwt.VerifyOptions = {
        algorithms: ['RS256'],
        issuer: APPLE_ISSUER,
      };

      if (this.appleBundleId) {
        verifyOptions.audience = this.appleBundleId;
      }

      const payload = jwt.verify(
        idToken,
        publicKey,
        verifyOptions,
      ) as jwt.JwtPayload & {
        email?: string;
        name?: string;
      };

      if (!payload.email) {
        throw new Error('Missing email in Apple token payload');
      }

      return {
        username: payload.sub || '',
        name:
          payload.name || this.getUsernameFromEmail(payload.email) || 'Membro',
        email: payload.email,
        photo: null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Apple token verification failed: ${message}`);
      throw new UnauthorizedException('Invalid Apple token');
    }
  }

  private getUsernameFromEmail(
    email: string | null | undefined,
  ): string | null {
    if (!email) return null;
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return null;
    return email.substring(0, atIndex);
  }
}
