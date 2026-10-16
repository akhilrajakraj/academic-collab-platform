import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import { ProjectRole } from '@prisma/client';

const assignableRoles = [ProjectRole.EDITOR, ProjectRole.REVIEWER, ProjectRole.VIEWER];

export class CreateInvitationDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsIn(assignableRoles)
  role?: ProjectRole;
}
