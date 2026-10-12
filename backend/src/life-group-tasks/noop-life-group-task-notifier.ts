import { Injectable } from '@nestjs/common';
import { LifeGroupTaskNotifier } from './life-group-task-notifier';

// Default no-op so the services work (and are testable) without the
// notifications module.
@Injectable()
export class NoopLifeGroupTaskNotifier extends LifeGroupTaskNotifier {
  notifyReassigned(): Promise<void> {
    return Promise.resolve();
  }

  notifyUnassignable(): Promise<void> {
    return Promise.resolve();
  }
}
