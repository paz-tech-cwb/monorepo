import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from './common/constants/global-validation-pipe-options';
import { BackendErrorMonitoringFilter } from './common/filters/backend-error-monitoring.filter';
import { initializeErrorMonitoring } from './common/monitoring/error-monitoring';

async function bootstrap() {
  initializeErrorMonitoring();

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'excludeAll',
      excludeExtraneousValues: true,
    }),
  );

  app.use((req: { startTime?: number }, _res: unknown, next: () => void) => {
    req.startTime = Date.now();
    next();
  });

  app.useGlobalFilters(new BackendErrorMonitoringFilter());

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
