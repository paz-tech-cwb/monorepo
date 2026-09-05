import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FormCoursesService } from './form-courses.service';
import { CreateFormCourseDto } from './dto/create-form-course.dto';
import { UpdateFormCourseDto } from './dto/update-form-course.dto';
import { FormCourseResponseDto } from './dto/form-course-response.dto';
import { plainToInstance } from 'class-transformer';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class FormCoursesController {
  constructor(private readonly svc: FormCoursesService) {}

  @Get('form-courses')
  async listAll() {
    const courses = await this.svc.listAll();
    return plainToInstance(FormCourseResponseDto, courses, {
      excludeExtraneousValues: true,
    });
  }

  @Get('forms/member-registrations/courses')
  async list() {
    const courses = await this.svc.listForForm('member-registrations');
    return plainToInstance(FormCourseResponseDto, courses, {
      excludeExtraneousValues: true,
    });
  }

  @Post('forms/member-registrations/courses')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() dto: CreateFormCourseDto) {
    const course = await this.svc.createAndLink('member-registrations', dto);
    return plainToInstance(FormCourseResponseDto, course, {
      excludeExtraneousValues: true,
    });
  }

  @Post('forms/member-registrations/courses/:courseId/link')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async link(@Param('courseId') courseId: string) {
    const course = await this.svc.linkExisting(
      'member-registrations',
      courseId,
    );
    return plainToInstance(FormCourseResponseDto, course, {
      excludeExtraneousValues: true,
    });
  }

  @Patch('form-courses/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateFormCourseDto) {
    const course = await this.svc.update(id, dto);
    return plainToInstance(FormCourseResponseDto, course, {
      excludeExtraneousValues: true,
    });
  }

  @Delete('forms/member-registrations/courses/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  unlink(@Param('id') id: string) {
    return this.svc.unlink('member-registrations', id);
  }
}
