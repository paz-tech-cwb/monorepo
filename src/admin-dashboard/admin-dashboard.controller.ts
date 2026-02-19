import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminDashboardService } from './admin-dashboard.service';

@UseGuards(AuthGuard('jwt'))
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  getStats() {
    return this.adminDashboardService.getStats();
  }

  @Get('access-trends')
  getAccessTrends() {
    return this.adminDashboardService.getAccessTrends();
  }

  @Get('member-growth')
  getMemberGrowth() {
    return this.adminDashboardService.getMemberGrowth();
  }

  @Get('life-groups-distribution')
  getLifeGroupDistribution() {
    return this.adminDashboardService.getLifeGroupDistribution();
  }
}
