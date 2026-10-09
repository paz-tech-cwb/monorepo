import { BadRequestException } from '@nestjs/common';
import { CourseLessonsService } from './course-lessons.service';
import { extractYoutubeId } from './utils/youtube';

describe('extractYoutubeId', () => {
  it('extracts the id from a watch?v= URL', () => {
    expect(
      extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id from a youtu.be short URL', () => {
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('extracts the id from an /embed/ URL', () => {
    expect(extractYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('accepts a bare 11-character video id', () => {
    expect(extractYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects invalid input', () => {
    expect(() => extractYoutubeId('not-a-url-or-id')).toThrow(
      BadRequestException,
    );
    expect(() => extractYoutubeId('https://example.com/video')).toThrow(
      BadRequestException,
    );
    expect(() => extractYoutubeId('')).toThrow(BadRequestException);
  });
});

describe('CourseLessonsService', () => {
  type FakeLesson = { id: string; sortOrder: number };

  function buildManager(lessons: FakeLesson[]) {
    const saved: FakeLesson[] = [];
    const manager = {
      find: jest.fn().mockResolvedValue(lessons),
      save: jest
        .fn()
        .mockImplementation((_entity: unknown, value: FakeLesson) => {
          saved.push(value);
          return Promise.resolve(value);
        }),
      transaction: jest
        .fn()
        .mockImplementation((cb: (m: typeof manager) => Promise<unknown>) =>
          cb(manager),
        ),
    };
    return { manager, saved };
  }

  it('persists sort_order for each lesson in the requested order', async () => {
    const lessons = [
      { id: 'a', sortOrder: 0 },
      { id: 'b', sortOrder: 1 },
      { id: 'c', sortOrder: 2 },
    ];
    const { manager, saved } = buildManager(lessons);
    const service = new CourseLessonsService(manager as never);

    await service.reorder('course-1', { lesson_ids: ['c', 'a', 'b'] });

    expect(saved.find((l) => l.id === 'c')?.sortOrder).toBe(0);
    expect(saved.find((l) => l.id === 'a')?.sortOrder).toBe(1);
    expect(saved.find((l) => l.id === 'b')?.sortOrder).toBe(2);
  });

  describe('thumbnail_url defaulting', () => {
    function buildCreateManager() {
      const manager = {
        create: jest
          .fn()
          .mockImplementation((_entity: unknown, value: unknown) => value),
        save: jest
          .fn()
          .mockImplementation((value: unknown) => Promise.resolve(value)),
      };
      return manager;
    }

    it('derives the hqdefault thumbnail from the bare video id when omitted', async () => {
      const manager = buildCreateManager();
      const service = new CourseLessonsService(manager as never);

      const result = await service.create('course-1', {
        title: 'Lesson 1',
        youtube_video_id: 'dQw4w9WgXcQ',
      } as never);

      expect(result.thumbnail_url).toBe(
        'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      );
    });

    it('derives the hqdefault thumbnail from a full watch URL when omitted', async () => {
      const manager = buildCreateManager();
      const service = new CourseLessonsService(manager as never);

      const result = await service.create('course-1', {
        title: 'Lesson 1',
        youtube_video_id: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      } as never);

      expect(result.thumbnail_url).toBe(
        'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      );
    });

    it('preserves an explicit thumbnail_url verbatim', async () => {
      const manager = buildCreateManager();
      const service = new CourseLessonsService(manager as never);

      const result = await service.create('course-1', {
        title: 'Lesson 1',
        youtube_video_id: 'dQw4w9WgXcQ',
        thumbnail_url: 'https://cdn.example.com/custom.jpg',
      } as never);

      expect(result.thumbnail_url).toBe('https://cdn.example.com/custom.jpg');
    });

    it('re-derives the thumbnail on update when the video id changes and no explicit thumbnail is sent', async () => {
      const existingLesson = {
        id: 'lesson-1',
        courseId: 'course-1',
        title: 'Lesson 1',
        description: null,
        youtubeVideoId: 'oldOldOldId',
        durationSeconds: null,
        thumbnailUrl: 'https://img.youtube.com/vi/oldOldOldId/hqdefault.jpg',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const manager = {
        findOne: jest.fn().mockResolvedValue(existingLesson),
        save: jest
          .fn()
          .mockImplementation((_entity: unknown, value: unknown) =>
            Promise.resolve(value),
          ),
      };
      const service = new CourseLessonsService(manager as never);

      const result = await service.update('course-1', 'lesson-1', {
        youtube_video_id: 'dQw4w9WgXcQ',
      } as never);

      expect(result.thumbnail_url).toBe(
        'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      );
    });

    it('keeps an explicit thumbnail_url on update untouched', async () => {
      const existingLesson = {
        id: 'lesson-1',
        courseId: 'course-1',
        title: 'Lesson 1',
        description: null,
        youtubeVideoId: 'dQw4w9WgXcQ',
        durationSeconds: null,
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const manager = {
        findOne: jest.fn().mockResolvedValue(existingLesson),
        save: jest
          .fn()
          .mockImplementation((_entity: unknown, value: unknown) =>
            Promise.resolve(value),
          ),
      };
      const service = new CourseLessonsService(manager as never);

      const result = await service.update('course-1', 'lesson-1', {
        thumbnail_url: 'https://cdn.example.com/manual.jpg',
      } as never);

      expect(result.thumbnail_url).toBe('https://cdn.example.com/manual.jpg');
    });

    it('preserves a genuinely custom thumbnail_url when the video id changes without an explicit thumbnail_url in the request', async () => {
      const existingLesson = {
        id: 'lesson-1',
        courseId: 'course-1',
        title: 'Lesson 1',
        description: null,
        youtubeVideoId: 'oldOldOldId',
        durationSeconds: null,
        // Genuinely custom: does NOT match the auto-derived URL for the current video id.
        thumbnailUrl: 'https://cdn.example.com/custom.jpg',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const manager = {
        findOne: jest.fn().mockResolvedValue(existingLesson),
        save: jest
          .fn()
          .mockImplementation((_entity: unknown, value: unknown) =>
            Promise.resolve(value),
          ),
      };
      const service = new CourseLessonsService(manager as never);

      const result = await service.update('course-1', 'lesson-1', {
        youtube_video_id: 'dQw4w9WgXcQ',
      } as never);

      // Changing the video id without an explicit thumbnail_url must NOT
      // overwrite a genuinely custom thumbnail — only auto-derived
      // thumbnails should be re-derived on video id change.
      expect(result.thumbnail_url).toBe('https://cdn.example.com/custom.jpg');
    });

    it('still re-derives an auto-derived thumbnail when the video id changes (no explicit thumbnail_url, no prior custom override)', async () => {
      const existingLesson = {
        id: 'lesson-1',
        courseId: 'course-1',
        title: 'Lesson 1',
        description: null,
        youtubeVideoId: 'oldOldOldId',
        durationSeconds: null,
        // Matches the auto-derived URL for the OLD video id — never customized.
        thumbnailUrl: 'https://img.youtube.com/vi/oldOldOldId/hqdefault.jpg',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const manager = {
        findOne: jest.fn().mockResolvedValue(existingLesson),
        save: jest
          .fn()
          .mockImplementation((_entity: unknown, value: unknown) =>
            Promise.resolve(value),
          ),
      };
      const service = new CourseLessonsService(manager as never);

      const result = await service.update('course-1', 'lesson-1', {
        youtube_video_id: 'dQw4w9WgXcQ',
      } as never);

      expect(result.thumbnail_url).toBe(
        'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      );
    });

    it('clears the thumbnail to null when thumbnail_url is explicitly sent as empty/null', async () => {
      const existingLesson = {
        id: 'lesson-1',
        courseId: 'course-1',
        title: 'Lesson 1',
        description: null,
        youtubeVideoId: 'dQw4w9WgXcQ',
        durationSeconds: null,
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const manager = {
        findOne: jest.fn().mockResolvedValue(existingLesson),
        save: jest
          .fn()
          .mockImplementation((_entity: unknown, value: unknown) =>
            Promise.resolve(value),
          ),
      };
      const service = new CourseLessonsService(manager as never);

      const result = await service.update('course-1', 'lesson-1', {
        thumbnail_url: '',
      } as never);

      expect(result.thumbnail_url).toBeNull();
    });

    it('clears the thumbnail to null when thumbnail_url is explicitly sent as null', async () => {
      const existingLesson = {
        id: 'lesson-1',
        courseId: 'course-1',
        title: 'Lesson 1',
        description: null,
        youtubeVideoId: 'dQw4w9WgXcQ',
        durationSeconds: null,
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const manager = {
        findOne: jest.fn().mockResolvedValue(existingLesson),
        save: jest
          .fn()
          .mockImplementation((_entity: unknown, value: unknown) =>
            Promise.resolve(value),
          ),
      };
      const service = new CourseLessonsService(manager as never);

      const result = await service.update('course-1', 'lesson-1', {
        thumbnail_url: null,
      } as never);

      expect(result.thumbnail_url).toBeNull();
    });
  });
});
