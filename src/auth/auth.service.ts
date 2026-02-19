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
import { JwksClient } from 'jwks-rsa';
import { UserAccount } from 'src/users/entities/account.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

const ACCESS_TOKEN_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
const JWT_ALGORITHM: jwt.Algorithm = 'HS256';

const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

const FIREBASE_JWKS_URI =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  private firebaseJwksClient: JwksClient;
  private appleJwksClient: JwksClient;

  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private firebaseProjectId: string;
  private appleBundleId: string;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserAccount)
    private userAccountRepo: Repository<UserAccount>,
    private configService: ConfigService,
  ) {
    this.accessTokenSecret = this.configService.getOrThrow<string>(
      'ACCESS_TOKEN_SECRET',
    );
    this.refreshTokenSecret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_SECRET',
    );
    this.firebaseProjectId = this.configService.getOrThrow<string>(
      'FIREBASE_PROJECT_ID',
    );
    this.appleBundleId = this.configService.get<string>('APPLE_BUNDLE_ID', '');

    this.firebaseJwksClient = new JwksClient({
      jwksUri: FIREBASE_JWKS_URI,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });
    this.appleJwksClient = new JwksClient({
      jwksUri: APPLE_JWKS_URI,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });
  }

  onModuleInit() {
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

    if (provider === 'google') {
      userData = await this.verifyGoogleToken(idToken);
    } else if (provider === 'apple') {
      userData = await this.verifyAppleToken(idToken);
    } else {
      throw new HttpException('Unsupported provider', HttpStatus.BAD_REQUEST);
    }

    userData.email = userData.email.toLowerCase();

    let user = await this.userRepo.findOne({
      where: { email: userData.email },
    });
    if (!user) {
      user = this.userRepo.create({
        name: userData.name,
        email: userData.email,
        picture: userData.photo ?? undefined,
        roleSlug: 'member',
      });
      await this.userRepo.save(user);
    }

    const tokens = await this.issueTokens(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.roleSlug,
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

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
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

    // Revoke the old token (rotation)
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
        role: user.roleSlug,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string, userId: number) {
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

    tokenRecord.isRevoked = true;
    await this.userAccountRepo.save(tokenRecord);

    return { success: true };
  }

  private async verifyGoogleToken(idToken: string) {
    try {
      // Decode the JWT header to retrieve the key ID (kid)
      const decodedHeader = jwt.decode(idToken, { complete: true });
      if (!decodedHeader || !decodedHeader.header?.kid) {
        throw new Error('Unable to decode Firebase token header');
      }

      // Fetch Firebase's public key for this kid
      const signingKey = await this.firebaseJwksClient.getSigningKey(
        decodedHeader.header.kid,
      );
      const publicKey = signingKey.getPublicKey();

      // Verify signature, issuer, audience, and expiration
      const payload = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        issuer: `https://securetoken.google.com/${this.firebaseProjectId}`,
        audience: this.firebaseProjectId,
      }) as jwt.JwtPayload & {
        email?: string;
        name?: string;
        picture?: string;
      };

      if (!payload.email) {
        throw new Error('Missing email in Firebase token payload');
      }

      return {
        username: payload.sub || '',
        name:
          payload.name || this.getUsernameFromEmail(payload.email) || 'User',
        email: payload.email,
        photo: payload.picture || null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Firebase token verification failed: ${message}`);
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
      // Decode header to get the key ID (kid)
      const decodedHeader = jwt.decode(idToken, { complete: true });
      if (!decodedHeader || !decodedHeader.header?.kid) {
        throw new Error('Unable to decode Apple token header');
      }

      // Fetch Apple's public key using the kid
      const signingKey = await this.appleJwksClient.getSigningKey(
        decodedHeader.header.kid,
      );
      const publicKey = signingKey.getPublicKey();

      // Verify the token signature, issuer, and expiration
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
        photo: null, // Apple tokens do not include a photo
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
