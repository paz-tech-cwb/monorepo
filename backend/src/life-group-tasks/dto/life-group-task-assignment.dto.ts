import { Expose } from 'class-transformer';
import { IsInt, IsUUID } from 'class-validator';

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
