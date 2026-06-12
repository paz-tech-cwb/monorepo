import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AtmosphereMinistry } from './entities/atmosphere-ministry.entity';
import { AtmosphereTeam } from './entities/atmosphere-team.entity';
import { AtmosphereService } from './atmosphere.service';
import { AtmosphereController } from './atmosphere.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AtmosphereMinistry, AtmosphereTeam])],
  controllers: [AtmosphereController],
  providers: [AtmosphereService],
  exports: [AtmosphereService],
})
export class AtmosphereModule {}
