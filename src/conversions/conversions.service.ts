import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  Conversion,
  ConversionType,
  Sex,
  CivilStatus,
  LifeGroupExperience,
} from './entities/conversion.entity';
import { CreateConversionDto } from './dto/create-conversion.dto';
import { UpdateConversionDto } from './dto/update-conversion.dto';

@Injectable()
export class ConversionsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(conversion: Conversion) {
    return {
      id: conversion.id,
      full_name: conversion.fullName,
      cellphone: conversion.cellphone ?? null,
      type: conversion.type,
      how_met_church: conversion.howMetChurch ?? null,
      sex: conversion.sex ?? null,
      age: conversion.age ?? null,
      civil_status: conversion.civilStatus ?? null,
      address: conversion.address ?? null,
      church_attendance_history: conversion.churchAttendanceHistory ?? null,
      life_group_experience: conversion.lifeGroupExperience ?? null,
      life_group_leader_name: conversion.lifeGroupLeaderName ?? null,
      who_invited: conversion.whoInvited ?? null,
      observations: conversion.observations ?? null,
      created_at: conversion.createdAt,
      updated_at: conversion.updatedAt,
    };
  }

  async create(dto: CreateConversionDto) {
    try {
      const conversion = this.entityManager.create(Conversion, {
        fullName: dto.full_name,
        cellphone: dto.cellphone ?? null,
        type: dto.type as ConversionType,
        howMetChurch: dto.how_met_church ?? null,
        sex: dto.sex ? (dto.sex as Sex) : null,
        age: dto.age ?? null,
        civilStatus: dto.civil_status
          ? (dto.civil_status as CivilStatus)
          : null,
        address: dto.address ?? null,
        churchAttendanceHistory: dto.church_attendance_history ?? null,
        lifeGroupExperience: dto.life_group_experience
          ? (dto.life_group_experience as LifeGroupExperience)
          : null,
        lifeGroupLeaderName: dto.life_group_leader_name ?? null,
        whoInvited: dto.who_invited ?? null,
        observations: dto.observations ?? null,
      });
      const saved = await this.entityManager.save(conversion);
      return this.toResponse(saved);
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while creating the conversion.',
      );
    }
  }

  async findAll(filters?: { type?: string }) {
    try {
      const queryBuilder = this.entityManager
        .createQueryBuilder(Conversion, 'conversion')
        .orderBy('conversion.created_at', 'DESC');

      if (filters?.type) {
        queryBuilder.andWhere('conversion.type = :type', {
          type: filters.type,
        });
      }

      const conversions = await queryBuilder.getMany();
      return conversions.map((c) => this.toResponse(c));
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving conversions.',
      );
    }
  }

  async findOne(id: number) {
    const conversion = await this.entityManager.findOne(Conversion, {
      where: { id },
    });
    if (!conversion) {
      throw new NotFoundException(`Conversion with ID ${id} not found`);
    }
    return this.toResponse(conversion);
  }

  async findOneEntity(id: number): Promise<Conversion> {
    const conversion = await this.entityManager.findOne(Conversion, {
      where: { id },
    });
    if (!conversion) {
      throw new NotFoundException(`Conversion with ID ${id} not found`);
    }
    return conversion;
  }

  async update(id: number, dto: UpdateConversionDto) {
    try {
      const conversion = await this.findOneEntity(id);

      if (dto.full_name !== undefined) conversion.fullName = dto.full_name;
      if (dto.cellphone !== undefined) conversion.cellphone = dto.cellphone;
      if (dto.type !== undefined) conversion.type = dto.type as ConversionType;
      if (dto.how_met_church !== undefined)
        conversion.howMetChurch = dto.how_met_church;
      if (dto.sex !== undefined)
        conversion.sex = dto.sex ? (dto.sex as Sex) : null;
      if (dto.age !== undefined) conversion.age = dto.age;
      if (dto.civil_status !== undefined)
        conversion.civilStatus = dto.civil_status
          ? (dto.civil_status as CivilStatus)
          : null;
      if (dto.address !== undefined) conversion.address = dto.address;
      if (dto.church_attendance_history !== undefined)
        conversion.churchAttendanceHistory = dto.church_attendance_history;
      if (dto.life_group_experience !== undefined)
        conversion.lifeGroupExperience = dto.life_group_experience
          ? (dto.life_group_experience as LifeGroupExperience)
          : null;
      if (dto.life_group_leader_name !== undefined)
        conversion.lifeGroupLeaderName = dto.life_group_leader_name;
      if (dto.who_invited !== undefined)
        conversion.whoInvited = dto.who_invited;
      if (dto.observations !== undefined)
        conversion.observations = dto.observations;

      const saved = await this.entityManager.save(Conversion, conversion);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the conversion.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const conversion = await this.findOneEntity(id);
    await this.entityManager.remove(Conversion, conversion);
  }
}
