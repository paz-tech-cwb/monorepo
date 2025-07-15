import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserController } from 'controllers/user.controller/user.controller';
import { UserService } from 'services/user.service/user.service';
import { User } from 'entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])], 
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
