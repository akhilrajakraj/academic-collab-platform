import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
