import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CourseTracksService } from './course-tracks.service';
import { CreateCourseTrackDto } from './dto/create-course-track.dto';
import { UpdateCourseTrackDto } from './dto/update-course-track.dto';
import { SetTrackCoursesDto } from './dto/set-track-courses.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('course-tracks')
export class CourseTracksController {
  constructor(private readonly courseTracksService: CourseTracksService) {}

  @Get()
  findAll() {
    return this.courseTracksService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateCourseTrackDto) {
    return this.courseTracksService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCourseTrackDto) {
    return this.courseTracksService.update(+id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.courseTracksService.remove(+id);
  }

  @Put(':id/courses')
  setCourses(@Param('id') id: string, @Body() dto: SetTrackCoursesDto) {
    return this.courseTracksService.setCourses(+id, dto);
  }
}
