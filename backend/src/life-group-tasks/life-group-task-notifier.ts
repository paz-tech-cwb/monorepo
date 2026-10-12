// Notification hook used by the life group task services. The services only
// depend on this abstract class, so the notifications wiring (implemented in
// phase B3) stays out of this module's imports and cannot create a cycle.

export interface LifeGroupTaskNotice {
  assignmentId: string;
  // The (new) assignee to notify.
  userId: number;
  lifeGroupId: number;
  meetingDate: string; // YYYY-MM-DD
  taskName: string;
}

export type LifeGroupTaskReassignReason = 'reroll' | 'manual' | 'decline';

export interface LifeGroupTaskReassignContext {
  previousUserId: number;
  reason: LifeGroupTaskReassignReason;
}

export interface LifeGroupTaskUnassignableContext {
  lifeGroupId: number;
  meetingDate: string;
  // Template names that currently have no eligible candidate.
  taskNames: string[];
}

export abstract class LifeGroupTaskNotifier {
  /** Notify the new assignee and the group's leader/co-leader. */
  abstract notifyReassigned(
    notice: LifeGroupTaskNotice,
    context: LifeGroupTaskReassignContext,
  ): Promise<void>;

  /** Notify the leader/co-leader that no eligible member exists for tasks. */
  abstract notifyUnassignable(
    context: LifeGroupTaskUnassignableContext,
  ): Promise<void>;
}
