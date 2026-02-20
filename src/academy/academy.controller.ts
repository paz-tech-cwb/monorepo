import { Controller, Get, UseGuards, SerializeOptions } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AcademyService } from './academy.service';

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('academy')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get()
  getAcademy() {
    return this.academyService.getAcademy();
  }
}
