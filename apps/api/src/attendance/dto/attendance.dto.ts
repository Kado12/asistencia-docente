import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { AttendanceStatus } from '@control/database';

export class AttendanceRecordItemDto {
  @IsString()
  teacherClassId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional() @IsInt() @Min(0)
  lateMinutes?: number;

  @IsOptional() @IsString()
  notes?: string;
}

export class SaveDailyAttendanceDto {
  @IsString()
  date: string; // YYYY-MM-DD

  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordItemDto)
  @ArrayMinSize(1)
  records: AttendanceRecordItemDto[];
}