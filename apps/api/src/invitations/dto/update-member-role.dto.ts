import { IsIn } from 'class-validator';
import { ProjectRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsIn([ProjectRole.EDITOR, ProjectRole.REVIEWER, ProjectRole.VIEWER])
  role!: ProjectRole;
}
