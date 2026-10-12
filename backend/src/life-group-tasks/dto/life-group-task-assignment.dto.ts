import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class RerollTaskDto {
  @Expose({ name: 'assignment_id' })
  @IsUUID()
  assignmentId: string;
}

export class ReassignTaskDto {
  @Expose({ name: 'user_id' })
  @IsInt()
  userId: number;
}

export class GenerateTasksDto {
  // Defaults to the group's next meeting date when omitted.
  @Expose({ name: 'meeting_date' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  meetingDate?: string;
}
