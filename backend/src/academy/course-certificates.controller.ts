import {
  Controller,
  Get,
  Param,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CourseCertificatesService } from './course-certificates.service';

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('academy/certificates')
export class CourseCertificatesController {
  constructor(
    private readonly courseCertificatesService: CourseCertificatesService,
  ) {}

  @Get()
  listForUser(@Req() req: Request & { user: { id: number } }) {
    return this.courseCertificatesService.listForUser(req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.courseCertificatesService.findOneForUser(req.user.id, id);
  }
}
