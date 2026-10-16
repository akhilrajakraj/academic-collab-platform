import { IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @Matches(/\S/, { message: 'Comment body cannot be blank.' })
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsObject()
  anchor?: Record<string, unknown>;
}
