import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  SerializeOptions,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChurchService } from './church.service';
import { UpdateChurchDto } from './dto/update-church.dto';

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@Controller('church')
export class ChurchController {
  constructor(private readonly churchService: ChurchService) {}

  @Get()
  get() {
    return this.churchService.get();
  }

  @Put()
  update(@Body() updateChurchDto: UpdateChurchDto) {
    return this.churchService.update(updateChurchDto);
  }
}
