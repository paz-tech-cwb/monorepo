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
import { LIFE_GROUP_COUNTED_EXTRA_MEETINGS_PER_WEEK } from '../common/constants/life-group-meeting';
import { CHURCH_TIME_ZONE } from '../life-group-attendance/meeting-day.util';
import { LifeGroupTaskMemberSetting } from './entities/life-group-task-member-setting.entity';

export interface RosterMember {
  user: User;
  isLeader: boolean;
  isCoLeader: boolean;
  // Present entries counted by the eligibility rule: only meetings on or
  // after `joinedAt` (see decision 11).
  presentCount: number;
  // user_life_groups.joined_at, or null for users outside the join table
  // (e.g. a leader/co-leader who is not listed as a member).
  joinedAt: Date | null;
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

interface JoinedAtRow {
  user_id: number | string;
  joined_at: Date | string | null;
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

    // Only present=true entries of this group for meetings on or after the
    // member's join date (church timezone calendar day) count, so stale
    // attendance from a previous stint (or from before they joined) is
    // ignored. Users absent from user_life_groups are not filtered.
    const presentRows: PresentCountRow[] = await this.em.query(
      `SELECT e.user_id AS user_id, COUNT(*)::int AS present_count
       FROM life_group_attendance_entries e
       INNER JOIN life_group_attendance a ON a.id = e.attendance_id
       LEFT JOIN user_life_groups ulg
         ON ulg.user_id = e.user_id AND ulg.life_group_id = a.life_group_id
       WHERE a.life_group_id = $1
         AND e.present = true
         AND (
           ulg.joined_at IS NULL
           OR a.meeting_date >= (ulg.joined_at AT TIME ZONE $2)::date
         )
         AND (
           a.is_extra = false
           OR a.meeting_date IN (
             SELECT x.meeting_date FROM life_group_attendance x
             WHERE x.life_group_id = a.life_group_id
               AND x.is_extra = true
               AND date_trunc('week', x.meeting_date) = date_trunc('week', a.meeting_date)
             ORDER BY x.meeting_date ASC
             LIMIT ${LIFE_GROUP_COUNTED_EXTRA_MEETINGS_PER_WEEK}
           )
         )
       GROUP BY e.user_id`,
      [lifeGroup.id, CHURCH_TIME_ZONE],
    );
    const joinedRows: JoinedAtRow[] = await this.em.query(
      `SELECT user_id, joined_at FROM user_life_groups WHERE life_group_id = $1`,
      [lifeGroup.id],
    );
    const joinedByUser = new Map<number, Date>();
    for (const row of joinedRows) {
      if (row.joined_at) {
        joinedByUser.set(Number(row.user_id), new Date(row.joined_at));
      }
    }
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
        joinedAt: joinedByUser.get(user.id) ?? null,
        setting,
        eligible,
        source,
      });
    }
    members.sort((a, b) => a.user.name.localeCompare(b.user.name));
    return { minPresentMeetings, members };
  }
}
