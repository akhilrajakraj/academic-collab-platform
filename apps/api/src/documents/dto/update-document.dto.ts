import { DocumentStatus } from '@prisma/client';
import { IsEnum, IsObject, IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDocumentDto {
  /** ISO-8601 updatedAt value returned by GET /documents/:documentId. */
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;

  @IsOptional()
  @IsString()
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
