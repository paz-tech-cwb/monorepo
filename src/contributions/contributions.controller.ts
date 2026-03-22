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
import { ContributionResponseDto } from './dto/contribution-response.dto';

@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
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
  update(
    @Param('id') id: string,
    @Body() updateContributionDto: UpdateContributionDto,
  ): Promise<ContributionResponseDto> {
    return this.contributionsService.update(+id, updateContributionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.contributionsService.remove(+id);
  }
}
