import { IsDefined, IsString } from 'class-validator';

export class UpsertContentDto {
  @IsDefined()
  data: unknown;
}

export class ContentParamDto {
  @IsString()
  key: string;
}
