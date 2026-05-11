import {
  Controller, Post, Body, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, ChangePasswordDto, DeleteAccountDto } from './dto/profile.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private profile: ProfileService) {}

  @Post('update')
  update(@Body() dto: UpdateProfileDto) {
    return this.profile.update(dto);
  }

  @Post('change-password')
  changePassword(@Body() dto: ChangePasswordDto) {
    return this.profile.changePassword(dto);
  }

  @Post('delete-account')
  deleteAccount(@Body() dto: DeleteAccountDto) {
    return this.profile.deleteAccount(dto);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
    @Body('oldKey') oldKey?: string,
  ) {
    if (!file || !userId) throw new BadRequestException('Dados insuficientes.');
    return this.profile.uploadAvatar(userId, file, oldKey);
  }
}
