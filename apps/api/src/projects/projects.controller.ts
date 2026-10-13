import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.projects.list(userId);
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUserId() userId: string) {
    return this.projects.create(dto, userId);
  }

  @Get(':projectId/activity')
  activity(@Param('projectId', new ParseUUIDPipe()) projectId: string, @CurrentUserId() userId: string) {
    return this.projects.activity(projectId, userId);
  }

  @Get(':projectId')
  get(@Param('projectId', new ParseUUIDPipe()) projectId: string, @CurrentUserId() userId: string) {
    return this.projects.get(projectId, userId);
  }

  @Patch(':projectId')
  update(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUserId() userId: string,
  ) {
    return this.projects.update(projectId, dto, userId);
  }

  @Delete(':projectId')
  async remove(@Param('projectId', new ParseUUIDPipe()) projectId: string, @CurrentUserId() userId: string) {
    await this.projects.remove(projectId, userId);
    return { deleted: true };
  }
}
