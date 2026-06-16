import { SetMetadata } from '@nestjs/common';

export const MINISTRY_FORM_KEY = 'ministryFormSlug';
export const MinistryForm = (ministrySlug: string) =>
  SetMetadata(MINISTRY_FORM_KEY, ministrySlug);
