import { IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @Matches(/\\S/, { message: 'Document title cannot be blank.' })
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
