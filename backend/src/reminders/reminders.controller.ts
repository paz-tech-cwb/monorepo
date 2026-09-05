import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RemindersService } from './reminders.service';
import { UpdateReminderRuleDto } from './dto/update-reminder-rule.dto';

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@Controller('reminder-rules')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  findAll() {
    return this.remindersService.findAll();
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  update(@Param('id') id: string, @Body() dto: UpdateReminderRuleDto) {
    return this.remindersService.update(+id, dto);
  }
}
