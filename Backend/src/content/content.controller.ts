import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { UpsertContentDto } from './dto/content.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('content')
export class ContentController {
  constructor(private content: ContentService) {}

  @Get()
  findAll() {
    return this.content.findAll();
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.content.findOne(key);
  }

  @Put(':key')
  @UseGuards(AuthGuard)
  upsert(@Param('key') key: string, @Body() dto: UpsertContentDto) {
    return this.content.upsert(key, dto.data);
  }
}
