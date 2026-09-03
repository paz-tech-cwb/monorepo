import { SetMetadata } from '@nestjs/common';
export const FORM_SCOPE_KEY = 'form_scope';
export const FormScope = (slug: string) => SetMetadata(FORM_SCOPE_KEY, slug);
