import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AcademyService } from './academy.service';

@UseGuards(AuthGuard('jwt'))
@Controller('academy')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get()
  getAcademy() {
    return this.academyService.getAcademy();
  }
}
