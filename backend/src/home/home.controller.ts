import { Controller, Get, SerializeOptions } from '@nestjs/common';
import { HomeService } from './home.service';

@Controller('home')
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  async homeData() {
    return await this.homeService.getHomeContent();
  }
}
