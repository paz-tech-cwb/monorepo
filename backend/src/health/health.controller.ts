import { Controller, Get, SerializeOptions } from '@nestjs/common';

@Controller('health')
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
