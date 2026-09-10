import { Expose, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  ValidateNested,
} from 'class-validator';

export class AttendanceEntryDto {
  @Expose({ name: 'user_id' })
  @IsInt()
  userId: number;

  @Expose()
  @IsBoolean()
  present: boolean;
}

export class UpsertLifeGroupAttendanceDto {
  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
