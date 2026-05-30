import { PartialType } from '@nestjs/mapped-types';
import { CreateFormCourseDto } from './create-form-course.dto';
export class UpdateFormCourseDto extends PartialType(CreateFormCourseDto) {}
