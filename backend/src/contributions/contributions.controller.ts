import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { ContributionResponseDto } from './dto/contribution-response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';

@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...LEADERSHIP_ROLES)
  create(@Body() createContributionDto: CreateContributionDto): Promise<void> {
    return this.contributionsService.create(createContributionDto);
  }

  @Get()
  findAll(): Promise<ContributionResponseDto[]> {
    return this.contributionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ContributionResponseDto> {
    return this.contributionsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...LEADERSHIP_ROLES)
  update(
    @Param('id') id: string,
    @Body() updateContributionDto: UpdateContributionDto,
  ): Promise<ContributionResponseDto> {
    return this.contributionsService.update(+id, updateContributionDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...LEADERSHIP_ROLES)
  remove(@Param('id') id: string): Promise<void> {
    return this.contributionsService.remove(+id);
  }
}
