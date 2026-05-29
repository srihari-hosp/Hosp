import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterRequestDto {
  @IsString()
  @MinLength(2)
  hospitalName!: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  phone?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(3)
  licenseNo!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  gstin?: string;
}

export class LoginRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  mfaCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  backupCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  mfaToken?: string;
}
