import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchSetting } from '../entities/church-setting.entity';

@Injectable()
export class ChurchSettingsService {
  constructor(
    @InjectRepository(ChurchSetting)
    private readonly repo: Repository<ChurchSetting>,
  ) {}

  async getContactEmail(): Promise<string> {
    const row = await this.repo.findOne({ where: { key: 'contact_email' } });
    return (
      row?.value || process.env.DEFAULT_FROM_EMAIL || 'contato@igrejapaz.com.br'
    );
  }
}
