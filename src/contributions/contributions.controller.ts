import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { Contribution } from './entities/contribution.entity';

@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
  create(@Body() createContributionDto: CreateContributionDto): Promise<void> {
    return this.contributionsService.create(createContributionDto);
  }

  @Get()
  findAll(): Promise<Contribution[]> {
    return this.contributionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Contribution> {
    return this.contributionsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContributionDto: UpdateContributionDto,
  ): Promise<Contribution> {
    return this.contributionsService.update(+id, updateContributionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contributionsService.remove(+id);
  }
}
