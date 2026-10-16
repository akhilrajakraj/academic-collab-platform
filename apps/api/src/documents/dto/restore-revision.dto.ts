import { IsDateString, IsOptional } from 'class-validator';

export class RestoreRevisionDto {
  /** Current document updatedAt used as an optimistic concurrency precondition. */
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
