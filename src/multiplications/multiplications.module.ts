import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Multiplication } from './entities/multiplication.entity';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { MultiplicationsService } from './multiplications.service';
import { MultiplicationsController } from './multiplications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Multiplication]), FormsCoreModule],
  controllers: [MultiplicationsController],
  providers: [MultiplicationsService],
})
export class MultiplicationsModule {}
