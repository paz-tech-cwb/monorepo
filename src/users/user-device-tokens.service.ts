import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UserDeviceToken } from './entities/user-device-token.entity';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

@Injectable()
export class UserDeviceTokensService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async register(userId: number, dto: RegisterDeviceTokenDto): Promise<void> {
    const existing = await this.entityManager.findOne(UserDeviceToken, {
      where: { token: dto.token },
    });
    
    if (existing) {
      existing.user = { id: userId } as any;
      existing.platform = dto.platform;
      await this.entityManager.save(existing);
      return;
    }
    
    const record = this.entityManager.create(UserDeviceToken, {
      user: { id: userId },
      token: dto.token,
      platform: dto.platform,
    });
    await this.entityManager.save(record);
  }

  async remove(userId: number, token: string): Promise<void> {
    await this.entityManager.delete(UserDeviceToken, {
      token,
      user: { id: userId },
    });
  }

  async findAllForUser(userId: number): Promise<UserDeviceToken[]> {
    return this.entityManager.find(UserDeviceToken, {
      where: { user: { id: userId } },
    });
  }

  async removeStaleToken(token: string): Promise<void> {
    await this.entityManager.delete(UserDeviceToken, { token });
  }

  async markUsed(token: string): Promise<void> {
    await this.entityManager.update(
      UserDeviceToken,
      { token },
      { lastUsedAt: new Date() },
    );
  }
}
