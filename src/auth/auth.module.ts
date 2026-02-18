import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserAccount } from 'src/users/entities/account.entity';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User, UserAccount])],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
