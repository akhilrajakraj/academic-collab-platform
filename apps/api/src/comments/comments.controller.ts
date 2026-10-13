import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentsService } from './comments.service';

@Controller('documents/:documentId/comments')
export class DocumentCommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@Param('documentId', new ParseUUIDPipe()) documentId: string) {
    return this.comments.list(documentId);
  }

  @Post()
  create(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(documentId, dto);
  }
}

@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Patch(':commentId')
  update(
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.comments.setResolved(commentId, dto.resolved);
  }

  @Delete(':commentId')
  remove(@Param('commentId', new ParseUUIDPipe()) commentId: string) {
    return this.comments.remove(commentId);
  }
}
