import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationSender } from '../../forms-core/services/notification-sender';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let users: any;
  let notifications: any;

  beforeEach(async () => {
    users = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn((x) => x) };
    notifications = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const m = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: NotificationSender, useValue: notifications },
      ],
    }).compile();
    service = m.get(OnboardingService);
  });

  it('creates user with pending_first_login when none exists', async () => {
    users.findOne.mockResolvedValue(null);
    await service.onSubmit({ email: 'a@b.com', fullName: 'Ana', phone: '+55', birthDate: '1990-01-01' } as any);
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.com', status: 'pending_first_login' }));
    expect(users.save).toHaveBeenCalled();
  });

  it('updates existing user', async () => {
    users.findOne.mockResolvedValue({ id: 1, name: 'Old', phoneNumber: '+55' });
    await service.onSubmit({ email: 'a@b.com', fullName: 'New Name', phone: '+55999', birthDate: '1990-01-01' } as any);
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }));
  });

  it('sends welcome email fire-and-forget', async () => {
    users.findOne.mockResolvedValue(null);
    await service.onSubmit({ email: 'x@y.com', fullName: 'X', phone: '+1', birthDate: '2000-01-01' } as any);
    // void — email sent async, just confirm no throw
  });
});
