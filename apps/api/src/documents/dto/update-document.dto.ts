import { DocumentStatus } from '@prisma/client';
import { IsEnum, IsObject, IsDateString, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateDocumentDto {
  /** ISO-8601 updatedAt value returned by GET /documents/:documentId. */
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;

  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'Document title cannot be blank.' })
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}
