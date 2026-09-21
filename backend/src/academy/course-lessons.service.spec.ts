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
});
