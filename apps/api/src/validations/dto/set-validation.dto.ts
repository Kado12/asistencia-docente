import { IsString, IsInt, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ValidationStatus } from '@control/database';

export class SetValidationDto {
  @IsString()
  teacherId: string;

  @IsString()
  periodId: string;

  @IsInt() @Min(1) @Max(12)
  weekNumber: number;

  @IsEnum(ValidationStatus)
  status: ValidationStatus;

  @IsOptional() @IsString()
  comment?: string;
}