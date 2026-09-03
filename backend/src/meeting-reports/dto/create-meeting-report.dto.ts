import { Expose } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  IsNumber,
} from 'class-validator';

export class CreateMeetingReportDto {
  @Expose()
  @IsInt()
  leader_id: number;

  @Expose()
  @IsInt()
  life_group_id: number;

  @Expose()
  @IsDateString()
  meeting_date: string;

  @Expose()
  @IsInt()
  area_id: number;

  @Expose()
  @IsInt()
  sector_id: number;

  @Expose()
  @IsInt()
  @Min(0)
  total_members: number;

  @Expose()
  @IsInt()
  @Min(0)
  members_present: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  children_0_11?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  invited_persons?: number;

  @Expose()
  @IsOptional()
  @IsString()
  mdas?: string | null;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(0)
  offering_amount?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  tadel_attendees?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  culto_attendees?: number;
}
