import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list() {
    return this.projects.list();
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Get(':projectId/activity')
  activity(@Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return this.projects.activity(projectId);
  }

  @Get(':projectId')
  get(@Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return this.projects.get(projectId);
  }

  @Patch(':projectId')
  update(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(projectId, dto);
  }

  @Delete(':projectId')
  async remove(@Param('projectId', new ParseUUIDPipe()) projectId: string) {
    await this.projects.remove(projectId);
    return { deleted: true };
  }
}
