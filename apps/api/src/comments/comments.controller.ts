import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentsService } from './comments.service';

@UseGuards(JwtAuthGuard)
@Controller('documents/:documentId/comments')
export class DocumentCommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@Param('documentId', new ParseUUIDPipe()) documentId: string, @CurrentUserId() userId: string) {
    return this.comments.list(documentId, userId);
  }

  @Post()
  create(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.comments.create(documentId, dto, userId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Patch(':commentId')
  update(
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.comments.setResolved(commentId, dto.resolved, userId);
  }

  @Delete(':commentId')
  remove(@Param('commentId', new ParseUUIDPipe()) commentId: string, @CurrentUserId() userId: string) {
    return this.comments.remove(commentId, userId);
  }
}
