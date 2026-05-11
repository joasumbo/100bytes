import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class R2Service {
  private client: S3Client;
  private bucket: string;
  readonly cdnUrl: string;

  constructor(private config: ConfigService) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.get<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY')!,
      },
    });
    this.bucket = config.get<string>('R2_BUCKET')!;
    this.cdnUrl = config.get<string>('CDN_URL', 'https://cdn100ka.sysvenus.com');
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.byteLength,
      }),
    );
    return key;
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      // ignora se não existir
    }
  }

  publicUrl(key: string): string {
    return `${this.cdnUrl}/${key}`;
  }
}
