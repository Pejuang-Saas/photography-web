import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';

type UploadedImage = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly client: S3Client;
  private bucketReady?: Promise<void>;

  constructor(configService: ConfigService) {
    this.bucket = configService.get<string>('S3_BUCKET') ?? 'photography-assets';
    this.publicUrl = (
      configService.get<string>('S3_PUBLIC_URL') ??
      `http://localhost:9001/${this.bucket}`
    ).replace(/\/$/, '');

    this.client = new S3Client({
      region: configService.get<string>('S3_REGION') ?? 'us-east-1',
      endpoint: configService.get<string>('S3_ENDPOINT') ?? 'http://minio:9000',
      forcePathStyle: true,
      credentials: {
        accessKeyId:
          configService.get<string>('S3_ACCESS_KEY') ?? 'minioadmin',
        secretAccessKey:
          configService.get<string>('S3_SECRET_KEY') ?? 'minioadmin',
      },
    });
  }

  async uploadCmsImage(file: UploadedImage) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files can be uploaded');
    }

    await this.ensureBucket();

    const key = `cms/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${this.sanitizeFilename(file.originalname)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
      }),
    );

    return {
      key,
      url: `${this.publicUrl}/${key}`,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async deleteObject(key: string) {
    await this.ensureBucket();
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  private async ensureBucket() {
    this.bucketReady ??= this.createPublicBucket();
    return this.bucketReady;
  }

  private async createPublicBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }

    await this.client.send(
      new PutBucketPolicyCommand({
        Bucket: this.bucket,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        }),
      }),
    );
  }

  private sanitizeFilename(filename: string) {
    const extension = extname(filename).toLowerCase();
    const basename = filename
      .slice(0, filename.length - extension.length)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    return `${basename || 'image'}${extension}`;
  }
}
