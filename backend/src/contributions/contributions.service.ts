import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { ContributionResponseDto } from './dto/contribution-response.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Contribution } from './entities/contribution.entity';

@Injectable()
export class ContributionsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * This action adds a new contribution.
   * @param createContributionDto
   */
  async create(createContributionDto: CreateContributionDto): Promise<void> {
    const { bankName, branchNumber, accountNumber, pixKey } =
      createContributionDto;

    try {
      const contribution = this.entityManager.create(Contribution, {
        bankName,
        branchNumber,
        accountNumber,
        pixKey,
      });

      await this.entityManager.save(contribution);
    } catch (error) {
      console.log('Error: ', error);
      throw new BadRequestException(
        'An error ocurred while inserting the contribution.',
      );
    }
  }

  /**
   * This action returns all contributions.
   * @returns
   */
  async findAll(): Promise<ContributionResponseDto[]> {
    try {
      const contributions = await this.entityManager.find(Contribution);
      return plainToInstance(ContributionResponseDto, contributions);
    } catch (error) {
      console.log('Error: ', error);
      throw new BadRequestException(
        'An error occurred while finding all contributions.',
      );
    }
  }

  async findOne(id: number): Promise<ContributionResponseDto> {
    try {
      const contribution = await this.entityManager.findOne(Contribution, {
        where: { id },
      });

      if (!contribution) {
        throw new NotFoundException(`Contribution with ID ${id} not found`);
      }

      return plainToInstance(ContributionResponseDto, contribution);
    } catch {
      throw new NotFoundException(`Contribution with ID ${id} not found`);
    }
  }

  async update(
    id: number,
    updateContributionDto: UpdateContributionDto,
  ): Promise<ContributionResponseDto> {
    try {
      const contribution = await this.entityManager.findOne(Contribution, {
        where: { id },
      });

      if (!contribution) {
        throw new NotFoundException(`Contribution with ID ${id} not found`);
      }

      Object.assign(contribution, updateContributionDto);

      const saved = await this.entityManager.save(Contribution, contribution);
      return plainToInstance(ContributionResponseDto, saved);
    } catch {
      throw new NotFoundException(
        `It was not possible to update the Contribution.`,
      );
    }
  }

  async remove(id: number): Promise<void> {
    const contribution = await this.entityManager.findOne(Contribution, {
      where: { id },
    });

    if (!contribution) {
      throw new NotFoundException(`Contribution with ID ${id} not found`);
    }

    await this.entityManager.remove(Contribution, contribution);
  }
}
