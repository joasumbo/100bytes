import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('brands')
export class BrandsController {
  constructor(private brands: BrandsService) {}

  /** Rota pública — lista marcas activas com logo */
  @Get('public')
  findPublic() { return this.brands.findPublic(); }

  @UseGuards(AuthGuard)
  @Get()
  findAll() { return this.brands.findAll(); }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() dto: CreateBrandDto) { return this.brands.create(dto); }

  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) { return this.brands.update(id, dto); }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) { return this.brands.remove(id); }

  @UseGuards(AuthGuard)
  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('oldKey') oldKey?: string,
  ) {
    if (!file) throw new BadRequestException('Ficheiro em falta.');
    return this.brands.uploadLogo(id, file, oldKey);
  }

  @UseGuards(AuthGuard)
  @Delete(':id/logo')
  deleteLogo(@Param('id') id: string) { return this.brands.deleteLogo(id); }
}
