import { BadRequestException } from '@nestjs/common';

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts an 11-char YouTube video id from any of the common input shapes:
 * - `https://www.youtube.com/watch?v=VIDEOID`
 * - `https://youtu.be/VIDEOID`
 * - `https://www.youtube.com/embed/VIDEOID`
 * - a bare 11-char video id
 */
export function extractYoutubeId(input: string): string {
  const trimmed = (input ?? '').trim();

  if (YOUTUBE_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      if (YOUTUBE_ID_PATTERN.test(id)) return id;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v') ?? '';
        if (YOUTUBE_ID_PATTERN.test(id)) return id;
      }
      const embedMatch = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {
    // Not a valid URL — fall through to the rejection below.
  }

  throw new BadRequestException(
    'Invalid YouTube video URL or id. Provide a watch?v=, youtu.be/, /embed/ link, or a bare 11-character video id.',
  );
}
