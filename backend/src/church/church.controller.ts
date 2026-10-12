import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  SerializeOptions,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChurchService } from './church.service';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';
import { User } from '../users/entities/user.entity';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@Controller('church')
export class ChurchController {
  constructor(private readonly churchService: ChurchService) {}

  // Backward-compat: resolves to the requesting user's primary filial (or
  // the first church row if the user has none). Existing admin-ui/mobile
  // clients that only know about a single church keep working unchanged.
  @Get()
  get(@Request() req: { user: User }) {
    return this.churchService.get(req.user.id);
  }

  @Put()
  @Roles('admin')
  update(
    @Request() req: { user: User },
    @Body() updateChurchDto: UpdateChurchDto,
  ) {
    return this.churchService.update(updateChurchDto, req.user.id);
  }

  @Get('list')
  list() {
    return this.churchService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.churchService.findById(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() createChurchDto: CreateChurchDto) {
    return this.churchService.create(createChurchDto);
  }

  @Put(':id')
  @Roles('admin')
  updateById(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateChurchDto: UpdateChurchDto,
  ) {
    return this.churchService.updateById(id, updateChurchDto);
  }
}
