import { ValidationPipeOptions } from '@nestjs/common';

// Single source of truth for the global ValidationPipe config applied in
// main.ts — imported by tests that need to spin up a real Nest app with the
// exact same pipe behavior (e.g. life-group-analytics.controller.spec.ts),
// so the two can never drift apart.
export const GLOBAL_VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { excludeExtraneousValues: true },
};
