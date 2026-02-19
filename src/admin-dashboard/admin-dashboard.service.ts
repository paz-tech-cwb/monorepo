import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Member } from '../members/entities/member.entity';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getStats() {
    try {
      const totalMembers = await this.entityManager.count(Member);

      const activeMembers = await this.entityManager.count(Member, {
        where: { status: 'active' },
      });

      const lifeGroupsResult = await this.entityManager
        .createQueryBuilder(Member, 'member')
        .select('COUNT(DISTINCT member.life_group)::int', 'count')
        .where('member.life_group IS NOT NULL')
        .andWhere("member.life_group != ''")
        .getRawOne<{ count: number }>();

      const totalLifeGroups = Number(lifeGroupsResult?.count ?? 0);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const newMembersThisMonth = await this.entityManager
        .createQueryBuilder(Member, 'member')
        .where('member.created_at >= :start', { start: startOfMonth })
        .getCount();

      return {
        total_members: totalMembers,
        active_members: activeMembers,
        total_life_groups: totalLifeGroups,
        events_this_month: 0,
        new_members_this_month: newMembersThisMonth,
        contributions_this_month: 0,
      };
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving dashboard stats.',
      );
    }
  }

  async getAccessTrends() {
    try {
      // Returns the last 7 days with zero counts as placeholder
      // Future: integrate with Firebase Analytics or access log table
      const trends: Array<{ date: string; access_count: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        trends.push({
          date: d.toISOString().split('T')[0],
          access_count: 0,
        });
      }
      return trends;
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving access trends.',
      );
    }
  }

  async getMemberGrowth() {
    try {
      // Monthly rollup: past 12 months
      const results = await this.entityManager
        .createQueryBuilder(Member, 'member')
        .select("TO_CHAR(member.created_at, 'YYYY-MM')", 'month')
        .addSelect('COUNT(member.id)::int', 'new_members')
        .groupBy("TO_CHAR(member.created_at, 'YYYY-MM')")
        .orderBy("TO_CHAR(member.created_at, 'YYYY-MM')", 'ASC')
        .limit(12)
        .getRawMany<{ month: string; new_members: number }>();

      // Build cumulative total
      let running = 0;
      return results.map((row) => {
        running += Number(row.new_members);
        return {
          month: row.month,
          new_members: Number(row.new_members),
          total_members: running,
        };
      });
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving member growth data.',
      );
    }
  }

  async getLifeGroupDistribution() {
    try {
      const results = await this.entityManager
        .createQueryBuilder(Member, 'member')
        .select('member.life_group', 'name')
        .addSelect('COUNT(member.id)::int', 'member_count')
        .where('member.life_group IS NOT NULL')
        .andWhere("member.life_group != ''")
        .groupBy('member.life_group')
        .orderBy('member_count', 'DESC')
        .getRawMany<{ name: string; member_count: number }>();

      return results.map((row) => ({
        name: row.name,
        member_count: Number(row.member_count),
      }));
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving life group distribution.',
      );
    }
  }
}
