import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateTeacherClassDto {
  @IsString() teacherId: string;

  @IsString() courseId: string;

  @IsString() sedeId: string;

  @IsOptional() @IsString() classroomId?: string;

  @IsString() periodId: string;

  @IsInt() @Min(1) @Max(5) dayOfWeek: number;

  @IsOptional() @IsInt() hours?: number;

  @IsOptional() @IsString() startTime?: string;
}

export class UpdateTeacherClassDto {
  @IsOptional() @IsString() teacherId?: string;
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() sedeId?: string;
  @IsOptional() @IsString() classroomId?: string;
  @IsOptional() @IsString() periodId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) dayOfWeek?: number;
  @IsOptional() @IsInt() hours?: number;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() isActive?: boolean;
}