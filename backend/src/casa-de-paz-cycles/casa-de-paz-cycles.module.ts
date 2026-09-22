import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasaDePazCycle } from './entities/casa-de-paz-cycle.entity';
import { CasaDePazCyclesService } from './casa-de-paz-cycles.service';
import { CasaDePazCyclesController } from './casa-de-paz-cycles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CasaDePazCycle])],
  controllers: [CasaDePazCyclesController],
  providers: [CasaDePazCyclesService],
  exports: [CasaDePazCyclesService],
})
export class CasaDePazCyclesModule {}
