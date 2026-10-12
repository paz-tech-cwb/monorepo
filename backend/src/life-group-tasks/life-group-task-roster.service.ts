import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { User } from '../users/entities/user.entity';
import { EligibilitySource, resolveEligibility } from './eligibility';
import {
  DEFAULT_MIN_PRESENT_MEETINGS,
  LifeGroupTaskGroupSetting,
} from './entities/life-group-task-group-setting.entity';
import { LifeGroupTaskMemberSetting } from './entities/life-group-task-member-setting.entity';

export interface RosterMember {
  user: User;
  isLeader: boolean;
  isCoLeader: boolean;
  presentCount: number;
  // Explicit per-member setting row, or null when none (= automatic rule).
  setting: LifeGroupTaskMemberSetting | null;
  eligible: boolean;
  source: EligibilitySource;
}

export interface LifeGroupRoster {
  minPresentMeetings: number;
  members: RosterMember[];
}

interface PresentCountRow {
  user_id: number | string;
  present_count: number | string;
}

@Injectable()
export class LifeGroupTaskRosterService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async getMinPresentMeetings(lifeGroupId: number): Promise<number> {
    const setting = await this.em.findOne(LifeGroupTaskGroupSetting, {
      where: { lifeGroupId },
    });
    return setting?.minPresentMeetings ?? DEFAULT_MIN_PRESENT_MEETINGS;
  }

  /**
   * Group members (user_life_groups) UNION leader and co-leader, deduped and
   * without inactive users, each with its resolved eligibility. The leader
   * and co-leader may or may not also be in user_life_groups.
   */
  async resolveRoster(lifeGroup: LifeGroup): Promise<LifeGroupRoster> {
    const users = new Map<number, User>();
    for (const user of lifeGroup.users ?? []) users.set(user.id, user);
    if (lifeGroup.leader) users.set(lifeGroup.leader.id, lifeGroup.leader);
    if (lifeGroup.coLeader) {
      users.set(lifeGroup.coLeader.id, lifeGroup.coLeader);
    }

    const minPresentMeetings = await this.getMinPresentMeetings(lifeGroup.id);

    const settings = await this.em.find(LifeGroupTaskMemberSetting, {
      where: { lifeGroupId: lifeGroup.id },
    });
    const settingByUser = new Map<number, LifeGroupTaskMemberSetting>();
    for (const setting of settings) settingByUser.set(setting.userId, setting);

    const presentRows: PresentCountRow[] = await this.em.query(
      `SELECT e.user_id AS user_id, COUNT(*)::int AS present_count
       FROM life_group_attendance_entries e
       INNER JOIN life_group_attendance a ON a.id = e.attendance_id
       WHERE a.life_group_id = $1 AND e.present = true
       GROUP BY e.user_id`,
      [lifeGroup.id],
    );
    const presentByUser = new Map<number, number>();
    for (const row of presentRows) {
      presentByUser.set(Number(row.user_id), Number(row.present_count));
    }

    const members: RosterMember[] = [];
    for (const user of users.values()) {
      if (user.status === 'inactive') continue;
      const isLeader = lifeGroup.leader?.id === user.id;
      const isCoLeader = lifeGroup.coLeader?.id === user.id;
      const setting = settingByUser.get(user.id) ?? null;
      const presentCount = presentByUser.get(user.id) ?? 0;
      const { eligible, source } = resolveEligibility({
        explicitEligible: setting ? setting.eligible : null,
        isLeaderOrCoLeader: isLeader || isCoLeader,
        presentCount,
        minPresentMeetings,
      });
      members.push({
        user,
        isLeader,
        isCoLeader,
        presentCount,
        setting,
        eligible,
        source,
      });
    }
    members.sort((a, b) => a.user.name.localeCompare(b.user.name));
    return { minPresentMeetings, members };
  }
}
