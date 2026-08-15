import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreateTeacherDto {
  @IsString() firstName: string;

  @IsString() lastName: string;

  @IsString() dni: string;

  @IsOptional() @IsString() phone?: string;

  @IsOptional() @IsEmail() email?: string;
}

export class UpdateTeacherDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() dni?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}