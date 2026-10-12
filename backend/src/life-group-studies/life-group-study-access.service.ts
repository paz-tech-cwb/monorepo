import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { LifeGroupStudyPublisher } from './entities/life-group-study-publisher.entity';

export const LIFE_GROUP_STUDY_LEADERSHIP_ROLES = [
  'admin',
  'pastor',
  'area_leader',
  'sector_leader',
  'life_group_leader',
] as const;

@Injectable()
export class LifeGroupStudyAccessService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * True if the user can publish/edit/delete Estudo do Life content:
   * - has one of the leadership roles, OR
   * - is leader or co-leader on at least one life group, OR
   * - has an explicit grant in life_group_study_publishers.
   */
  async canPublish(user: User): Promise<boolean> {
    const slug = user.role?.slug;
    if (
      slug &&
      (LIFE_GROUP_STUDY_LEADERSHIP_ROLES as readonly string[]).includes(slug)
    ) {
      return true;
    }

    // Leaders/co-leaders are matched by group assignment, not role slug: a
    // `member`-role user can be leader_id/co_leader_id of a group.
    const ledGroupCount = await this.entityManager.count(LifeGroup, {
      where: [{ leader: { id: user.id } }, { coLeader: { id: user.id } }],
    });
    if (ledGroupCount > 0) return true;

    const grantCount = await this.entityManager.count(LifeGroupStudyPublisher, {
      where: { userId: user.id },
    });
    return grantCount > 0;
  }

  /**
   * True if the user belongs to at least one life group and can therefore
   * view Estudo do Life content, OR the user already has publish
   * privileges (admins/pastors/leaders/co-leaders/grant-holders can always
   * view even if they are not personally in a life group).
   */
  async canView(user: User): Promise<boolean> {
    if (await this.canPublish(user)) return true;

    const count = await this.entityManager
      .createQueryBuilder(User, 'u')
      .innerJoin('u.lifeGroups', 'lg')
      .where('u.id = :id', { id: user.id })
      .getCount();
    return count > 0;
  }

  /**
   * Resolves every user who should be notified when a new study is
   * published. Studies are church-wide (no per-group targeting), so the
   * audience is: every rostered member of any life group, every life group
   * leader and co-leader (matched by assignment, so `member`-role leaders
   * are included), plus users holding a leadership role. Deduplicated by id;
   * `excludeUserId` (the publisher) is left out.
   */
  async resolveNotificationRecipients(excludeUserId?: number): Promise<User[]> {
    const rosterUsers = await this.entityManager
      .createQueryBuilder(User, 'u')
      .innerJoin('u.lifeGroups', 'lg')
      .getMany();

    const groups = await this.entityManager
      .createQueryBuilder(LifeGroup, 'lg')
      .leftJoinAndSelect('lg.leader', 'leader')
      .leftJoinAndSelect('lg.coLeader', 'coLeader')
      .getMany();

    const leadershipUsers = await this.entityManager
      .createQueryBuilder(User, 'u')
      .leftJoinAndSelect('u.role', 'role')
      .where('role.slug IN (:...roles)', {
        roles: LIFE_GROUP_STUDY_LEADERSHIP_ROLES,
      })
      .getMany();

    const byId = new Map<number, User>();
    for (const u of rosterUsers) byId.set(u.id, u);
    for (const lg of groups) {
      if (lg.leader) byId.set(lg.leader.id, lg.leader);
      if (lg.coLeader) byId.set(lg.coLeader.id, lg.coLeader);
    }
    for (const u of leadershipUsers) byId.set(u.id, u);
    if (excludeUserId !== undefined) byId.delete(excludeUserId);

    return [...byId.values()];
  }
}
