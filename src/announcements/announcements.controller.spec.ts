import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { Announcement } from './entities/announcement.entity';

describe('AnnouncementsController', () => {
  let controller: AnnouncementsController;

  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementsController],
      providers: [
        AnnouncementsService,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    controller = module.get<AnnouncementsController>(AnnouncementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('replace() delegates to the same update path as update()', async () => {
    const updateSpy = jest
      .spyOn(controller['announcementsService'], 'update')
      .mockResolvedValue({} as Announcement);

    await controller.replace('1', {});
    await controller.update('1', {});

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenNthCalledWith(1, 1, {});
    expect(updateSpy).toHaveBeenNthCalledWith(2, 1, {});
  });
});
