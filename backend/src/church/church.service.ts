import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Church } from './entities/church.entity';
import { UpdateChurchDto } from './dto/update-church.dto';

@Injectable()
export class ChurchService {
  private readonly CHURCH_ID = 1;

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(church: Church) {
    return {
      id: church.id,
      name: church.name,
      description: church.description ?? null,
      address: church.address,
      contact: church.contact,
      schedule: church.schedule,
      social_media: church.socialMedia,
      updated_at: church.updatedAt,
    };
  }

  async get() {
    const church = await this.entityManager.findOne(Church, {
      where: { id: this.CHURCH_ID },
    });
    if (!church) {
      throw new NotFoundException('Church record not found.');
    }
    return this.toResponse(church);
  }

  async update(dto: UpdateChurchDto) {
    try {
      let church = await this.entityManager.findOne(Church, {
        where: { id: this.CHURCH_ID },
      });

      if (!church) {
        // Create the singleton record if it doesn't exist
        church = this.entityManager.create(Church, {
          id: this.CHURCH_ID,
          name: dto.name ?? 'Igreja Paz Curitiba',
          description: dto.description ?? null,
          address: (dto.address as unknown as Church['address']) ?? {},
          contact: (dto.contact as unknown as Church['contact']) ?? {},
          schedule: (dto.schedule as unknown as Church['schedule']) ?? {},
          socialMedia:
            (dto.social_media as unknown as Church['socialMedia']) ?? {},
        });
      } else {
        if (dto.name !== undefined) church.name = dto.name;
        if (dto.description !== undefined) church.description = dto.description;
        if (dto.address !== undefined)
          church.address = {
            ...church.address,
            ...(dto.address as unknown as Church['address']),
          };
        if (dto.contact !== undefined)
          church.contact = {
            ...church.contact,
            ...(dto.contact as unknown as Church['contact']),
          };
        if (dto.schedule !== undefined)
          church.schedule = {
            ...church.schedule,
            ...(dto.schedule as unknown as Church['schedule']),
          };
        if (dto.social_media !== undefined)
          church.socialMedia = {
            ...church.socialMedia,
            ...(dto.social_media as unknown as Church['socialMedia']),
          };
      }

      const saved = await this.entityManager.save(Church, church);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while updating church data.',
      );
    }
  }
}
