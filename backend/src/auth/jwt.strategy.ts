import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: {
    userId: number;
    email: string;
    churchId?: number | null;
  }) {
    const user = await this.userRepo.findOne({ where: { id: payload.userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    // Carries the primary filial id from the JWT onto req.user, so
    // controllers can scope reads without an extra DB round trip. Assigned
    // onto the loaded User instance (not spread into a new object) to keep
    // `role` eager-loading and other User behavior intact.
    return Object.assign(user, { churchId: payload.churchId ?? null });
  }
}
