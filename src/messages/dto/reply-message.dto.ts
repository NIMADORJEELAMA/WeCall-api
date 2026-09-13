import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReplyMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
