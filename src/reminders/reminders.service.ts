import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderRule } from './entities/reminder-rule.entity';
import { UpdateReminderRuleDto } from './dto/update-reminder-rule.dto';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(ReminderRule)
    private readonly repo: Repository<ReminderRule>,
  ) {}

  findAll(): Promise<ReminderRule[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async update(
    id: number,
    dto: UpdateReminderRuleDto,
  ): Promise<ReminderRule> {
    const rule = await this.repo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Reminder rule #${id} not found`);
    if (dto.enabled !== undefined) rule.enabled = dto.enabled;
    if (dto.config !== undefined) rule.config = dto.config;
    return this.repo.save(rule);
  }
}
