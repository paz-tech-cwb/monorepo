import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  SerializeOptions,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChurchService } from './church.service';
import { UpdateChurchDto } from './dto/update-church.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@Controller('church')
export class ChurchController {
  constructor(private readonly churchService: ChurchService) {}

  @Get()
  get() {
    return this.churchService.get();
  }

  @Put()
  @Roles('admin')
  update(@Body() updateChurchDto: UpdateChurchDto) {
    return this.churchService.update(updateChurchDto);
  }
}
