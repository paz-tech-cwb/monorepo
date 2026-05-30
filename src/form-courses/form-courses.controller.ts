import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FormCoursesService } from './form-courses.service';
import { CreateFormCourseDto } from './dto/create-form-course.dto';
import { UpdateFormCourseDto } from './dto/update-form-course.dto';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class FormCoursesController {
  constructor(private readonly svc: FormCoursesService) {}

  @Get('forms/member-registrations/courses')
  list() { return this.svc.listForForm('member-registrations'); }

  @Post('forms/member-registrations/courses')
  @UseGuards(RolesGuard) @Roles('admin')
  create(@Body() dto: CreateFormCourseDto) {
    return this.svc.createAndLink('member-registrations', dto);
  }

  @Patch('form-courses/:id')
  @UseGuards(RolesGuard) @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateFormCourseDto) {
    return this.svc.update(id, dto);
  }

  @Delete('forms/member-registrations/courses/:id')
  @UseGuards(RolesGuard) @Roles('admin')
  unlink(@Param('id') id: string) {
    return this.svc.unlink('member-registrations', id);
  }
}
