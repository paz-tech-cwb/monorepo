import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

describe('AnnouncementsController', () => {
  let controller: AnnouncementsController;

  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockAnnouncement: Announcement = {
    id: 1,
    imageUrl: 'https://example.com/image.png',
    title: 'Title',
    subtitle: 'Subtitle',
    markdownContent: '# Hello',
    actionUrl: 'https://example.com/action',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
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

  it('registers a guard on the controller (AuthGuard(jwt))', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AnnouncementsController,
    ) as unknown[];
    expect(guards).toBeDefined();
    expect(guards).toHaveLength(1);
    // AuthGuard('jwt') returns a dynamically-created mixin class extending PassportGuard.
    expect(typeof guards[0]).toBe('function');
  });

  it('replace() delegates to the same update path as update()', async () => {
    const updateSpy = jest
      .spyOn(controller['announcementsService'], 'update')
      .mockResolvedValue(mockAnnouncement);

    await controller.replace('1', {});
    await controller.update('1', {});

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenNthCalledWith(1, 1, {});
    expect(updateSpy).toHaveBeenNthCalledWith(2, 1, {});
  });

  it('findOne() serializes the response to snake_case wire keys', async () => {
    jest
      .spyOn(controller['announcementsService'], 'findOne')
      .mockResolvedValue(mockAnnouncement);

    const result = await controller.findOne('1');
    const plain = instanceToPlain(result);

    expect(plain).toEqual({
      id: 1,
      image_url: mockAnnouncement.imageUrl,
      title: mockAnnouncement.title,
      subtitle: mockAnnouncement.subtitle,
      markdown_content: mockAnnouncement.markdownContent,
      action_url: mockAnnouncement.actionUrl,
      created_at: mockAnnouncement.createdAt,
      updated_at: mockAnnouncement.updatedAt,
    });
  });

  it('findAll() serializes each item to snake_case wire keys', async () => {
    jest
      .spyOn(controller['announcementsService'], 'findAll')
      .mockResolvedValue([mockAnnouncement]);

    const result = await controller.findAll();
    const plain = instanceToPlain(result);

    expect(plain).toEqual([
      {
        id: 1,
        image_url: mockAnnouncement.imageUrl,
        title: mockAnnouncement.title,
        subtitle: mockAnnouncement.subtitle,
        markdown_content: mockAnnouncement.markdownContent,
        action_url: mockAnnouncement.actionUrl,
        created_at: mockAnnouncement.createdAt,
        updated_at: mockAnnouncement.updatedAt,
      },
    ]);
  });

  it('AnnouncementResponseDto directly serializes to snake_case keys', () => {
    const dto = plainToInstance(AnnouncementResponseDto, mockAnnouncement, {
      excludeExtraneousValues: true,
    });
    const plain = instanceToPlain(dto);

    expect(plain).toEqual({
      id: mockAnnouncement.id,
      image_url: mockAnnouncement.imageUrl,
      title: mockAnnouncement.title,
      subtitle: mockAnnouncement.subtitle,
      markdown_content: mockAnnouncement.markdownContent,
      action_url: mockAnnouncement.actionUrl,
      created_at: mockAnnouncement.createdAt,
      updated_at: mockAnnouncement.updatedAt,
    });
  });

  it('accepts a CreateAnnouncementDto without action_url', async () => {
    const dto = plainToInstance(
      CreateAnnouncementDto,
      {
        image_url: 'https://example.com/image.png',
        title: 'Title',
        subtitle: 'Subtitle',
        markdown_content: '# Hello',
      },
      { excludeExtraneousValues: true },
    );

    expect(dto.actionUrl).toBeUndefined();
    expect(dto.imageUrl).toBe('https://example.com/image.png');
    expect(dto.markdownContent).toBe('# Hello');

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
