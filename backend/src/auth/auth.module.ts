import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserAccount } from 'src/users/entities/account.entity';
import { Role } from 'src/roles/entities/role.entity';
import { UserDeviceToken } from 'src/users/entities/user-device-token.entity';
import { AuditLog } from './entities/audit-log.entity';
import { JwtStrategy } from './jwt.strategy';
import { AuditLogger } from './audit.logger';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      UserAccount,
      Role,
      UserDeviceToken,
      AuditLog,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuditLogger],
  exports: [AuthService],
})
export class AuthModule {}
