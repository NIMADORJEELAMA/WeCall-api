import {
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateCreatorProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  username?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  replyPrice?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateCreatorProfileDto)
  creatorProfile?: UpdateCreatorProfileDto;
}
