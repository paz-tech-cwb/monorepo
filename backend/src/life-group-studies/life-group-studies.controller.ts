import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LifeGroupStudiesService } from './life-group-studies.service';
import { CreateLifeGroupStudyDto } from './dto/create-life-group-study.dto';
import { UpdateLifeGroupStudyDto } from './dto/update-life-group-study.dto';
import { LifeGroupStudyResponseDto } from './dto/life-group-study-response.dto';
import { PublisherResponseDto } from './dto/publisher-response.dto';
import { GrantPublisherDto } from './dto/grant-publisher.dto';
import { User } from '../users/entities/user.entity';

interface AuthenticatedRequest {
  user: User;
}

@UseGuards(AuthGuard('jwt'))
@Controller('life-group-studies')
export class LifeGroupStudiesController {
  constructor(private readonly service: LifeGroupStudiesService) {}

  @Get('publishers')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async listPublishers(): Promise<PublisherResponseDto[]> {
    const publishers = await this.service.listPublishers();
    return plainToInstance(PublisherResponseDto, publishers, {
      excludeExtraneousValues: true,
    });
  }

  @Post('publishers')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async grantPublisher(
    @Body() dto: GrantPublisherDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PublisherResponseDto> {
    const publisher = await this.service.grantPublisher(
      dto.userId,
      req.user.id,
    );
    return plainToInstance(PublisherResponseDto, publisher, {
      excludeExtraneousValues: true,
    });
  }

  @Delete('publishers/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  revokePublisher(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    return this.service.revokePublisher(userId);
  }

  @Post()
  async create(
    @Body() dto: CreateLifeGroupStudyDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<LifeGroupStudyResponseDto> {
    const study = await this.service.create(dto, req.user);
    return plainToInstance(LifeGroupStudyResponseDto, study, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '20', 10) || 20),
    );
    const result = await this.service.findAllPaginated(
      req.user,
      pageNum,
      limitNum,
    );
    return {
      data: plainToInstance(LifeGroupStudyResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<LifeGroupStudyResponseDto> {
    const study = await this.service.findOne(id, req.user);
    return plainToInstance(LifeGroupStudyResponseDto, study, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLifeGroupStudyDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<LifeGroupStudyResponseDto> {
    const study = await this.service.update(id, dto, req.user);
    return plainToInstance(LifeGroupStudyResponseDto, study, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.service.remove(id, req.user);
  }
}
