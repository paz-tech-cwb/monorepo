import { ReminderSchedulerService } from './reminder-scheduler.service';
import { ReminderRule } from './entities/reminder-rule.entity';

describe('ReminderSchedulerService', () => {
  it('routes each enabled rule to the matching evaluator', async () => {
    const rules: ReminderRule[] = [
      { id: 1, type: 'event', enabled: true } as ReminderRule,
      { id: 2, type: 'form_report', enabled: true } as ReminderRule,
    ];
    const remindersService = {
      findEnabled: jest.fn().mockResolvedValue(rules),
    } as never;
    const eventEval = { type: 'event', run: jest.fn() };
    const formEval = { type: 'form_report', run: jest.fn() };

    const scheduler = new ReminderSchedulerService(remindersService, [
      eventEval as never,
      formEval as never,
    ]);
    await scheduler.tick();

    expect(eventEval.run).toHaveBeenCalledTimes(1);
    expect(formEval.run).toHaveBeenCalledTimes(1);
  });

  it('isolates evaluator failures (one throwing does not block others)', async () => {
    const rules: ReminderRule[] = [
      { id: 1, type: 'event', enabled: true } as ReminderRule,
      { id: 2, type: 'form_report', enabled: true } as ReminderRule,
    ];
    const remindersService = {
      findEnabled: jest.fn().mockResolvedValue(rules),
    } as never;
    const eventEval = {
      type: 'event',
      run: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const formEval = { type: 'form_report', run: jest.fn() };

    const scheduler = new ReminderSchedulerService(remindersService, [
      eventEval as never,
      formEval as never,
    ]);
    await scheduler.tick();
    expect(formEval.run).toHaveBeenCalledTimes(1);
  });
});
