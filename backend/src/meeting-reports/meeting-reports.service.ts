import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { MeetingReport } from './entities/meeting-report.entity';
import { CreateMeetingReportDto } from './dto/create-meeting-report.dto';
import { UpdateMeetingReportDto } from './dto/update-meeting-report.dto';

@Injectable()
export class MeetingReportsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(report: MeetingReport) {
    return {
      id: report.id,
      leader_id: report.leader.id,
      life_group_id: report.lifeGroup.id,
      meeting_date: report.meetingDate,
      area_id: report.area.id,
      sector_id: report.sector.id,
      total_members: report.totalMembers,
      members_present: report.membersPresent,
      children_0_11: report.children0To11,
      invited_persons: report.invitedPersons,
      mdas: report.mdas ?? null,
      offering_amount: Number(report.offeringAmount),
      tadel_attendees: report.tadelAttendees,
      culto_attendees: report.cultoAttendees,
      created_at: report.createdAt,
      updated_at: report.updatedAt,
    };
  }

  async create(dto: CreateMeetingReportDto) {
    try {
      const report = this.entityManager.create(MeetingReport, {
        leader: { id: dto.leader_id } as any,
        lifeGroup: { id: dto.life_group_id } as any,
        meetingDate: new Date(dto.meeting_date),
        area: { id: dto.area_id } as any,
        sector: { id: dto.sector_id } as any,
        totalMembers: dto.total_members,
        membersPresent: dto.members_present,
        children0To11: dto.children_0_11 ?? 0,
        invitedPersons: dto.invited_persons ?? 0,
        mdas: dto.mdas ?? null,
        offeringAmount: dto.offering_amount ?? 0,
        tadelAttendees: dto.tadel_attendees ?? 0,
        cultoAttendees: dto.culto_attendees ?? 0,
      });
      const saved = await this.entityManager.save(report);
      const loaded = await this.entityManager.findOne(MeetingReport, {
        where: { id: saved.id },
        relations: ['leader', 'lifeGroup', 'area', 'sector'],
      });
      return this.toResponse(loaded!);
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while creating the meeting report.',
      );
    }
  }

  async findAll(filters?: {
    life_group_id?: number;
    leader_id?: number;
    area_id?: number;
    sector_id?: number;
    start_date?: string;
    end_date?: string;
  }) {
    try {
      const queryBuilder = this.entityManager
        .createQueryBuilder(MeetingReport, 'report')
        .leftJoinAndSelect('report.leader', 'leader')
        .leftJoinAndSelect('report.lifeGroup', 'lifeGroup')
        .leftJoinAndSelect('report.area', 'area')
        .leftJoinAndSelect('report.sector', 'sector');

      if (filters?.life_group_id) {
        queryBuilder.andWhere('report.lifeGroup.id = :lifeGroupId', {
          lifeGroupId: filters.life_group_id,
        });
      }

      if (filters?.leader_id) {
        queryBuilder.andWhere('report.leader.id = :leaderId', {
          leaderId: filters.leader_id,
        });
      }

      if (filters?.area_id) {
        queryBuilder.andWhere('report.area.id = :areaId', {
          areaId: filters.area_id,
        });
      }

      if (filters?.sector_id) {
        queryBuilder.andWhere('report.sector.id = :sectorId', {
          sectorId: filters.sector_id,
        });
      }

      if (filters?.start_date) {
        queryBuilder.andWhere('report.meeting_date >= :startDate', {
          startDate: filters.start_date,
        });
      }

      if (filters?.end_date) {
        queryBuilder.andWhere('report.meeting_date <= :endDate', {
          endDate: filters.end_date,
        });
      }

      const reports = await queryBuilder
        .orderBy('report.meeting_date', 'DESC')
        .getMany();

      return reports.map((r) => this.toResponse(r));
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving meeting reports.',
      );
    }
  }

  async findOne(id: number) {
    const report = await this.entityManager.findOne(MeetingReport, {
      where: { id },
      relations: ['leader', 'lifeGroup', 'area', 'sector'],
    });
    if (!report) {
      throw new NotFoundException(`Meeting report with ID ${id} not found`);
    }
    return this.toResponse(report);
  }

  async findOneEntity(id: number): Promise<MeetingReport> {
    const report = await this.entityManager.findOne(MeetingReport, {
      where: { id },
      relations: ['leader', 'lifeGroup', 'area', 'sector'],
    });
    if (!report) {
      throw new NotFoundException(`Meeting report with ID ${id} not found`);
    }
    return report;
  }

  async update(id: number, dto: UpdateMeetingReportDto) {
    try {
      const report = await this.findOneEntity(id);

      if (dto.leader_id !== undefined)
        report.leader = { id: dto.leader_id } as any;
      if (dto.life_group_id !== undefined)
        report.lifeGroup = { id: dto.life_group_id } as any;
      if (dto.meeting_date !== undefined)
        report.meetingDate = new Date(dto.meeting_date);
      if (dto.area_id !== undefined) report.area = { id: dto.area_id } as any;
      if (dto.sector_id !== undefined)
        report.sector = { id: dto.sector_id } as any;
      if (dto.total_members !== undefined)
        report.totalMembers = dto.total_members;
      if (dto.members_present !== undefined)
        report.membersPresent = dto.members_present;
      if (dto.children_0_11 !== undefined)
        report.children0To11 = dto.children_0_11;
      if (dto.invited_persons !== undefined)
        report.invitedPersons = dto.invited_persons;
      if (dto.mdas !== undefined) report.mdas = dto.mdas ?? null;
      if (dto.offering_amount !== undefined)
        report.offeringAmount = dto.offering_amount;
      if (dto.tadel_attendees !== undefined)
        report.tadelAttendees = dto.tadel_attendees;
      if (dto.culto_attendees !== undefined)
        report.cultoAttendees = dto.culto_attendees;

      const saved = await this.entityManager.save(MeetingReport, report);
      const loaded = await this.entityManager.findOne(MeetingReport, {
        where: { id: saved.id },
        relations: ['leader', 'lifeGroup', 'area', 'sector'],
      });
      return this.toResponse(loaded!);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the meeting report.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const report = await this.findOneEntity(id);
    await this.entityManager.remove(MeetingReport, report);
  }
}
