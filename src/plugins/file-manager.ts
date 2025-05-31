import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { filesTable } from '@/db/schemas/files';
import type { UploadFile } from '@/types';
import { type Bucket, Storage } from '@google-cloud/storage';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

export class FileManager {
  server: FastifyInstance;
  storage: Storage;
  bucket: Bucket;
  maxFileSize: number;

  constructor(server: FastifyInstance) {
    this.server = server;
    this.storage = new Storage();
    this.bucket = this.storage.bucket(server.config.STORAGE_BUCKET);
    this.maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
  }

  private uploadFileToStorage = (file: UploadFile, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const hash = createHash('md5');
      const fullPath = `${path}/${hash
        .update(file.filename + Date.now())
        .digest('hex')}${extname(file.filename)}`;
      const bucketFile = this.bucket.file(fullPath);

      let uploadedSize = 0;
      const stream = file.createReadStream();

      stream.on('data', (chunk: Buffer) => {
        uploadedSize += chunk.length;

        if (uploadedSize > this.maxFileSize) {
          stream.destroy();
          reject(
            new Error(
              `File size exceeds ${(this.maxFileSize / 1024 / 1024).toFixed(0)}MB limit. File size: ${(uploadedSize / 1024 / 1024).toFixed(2)}MB`,
            ),
          );
          return;
        }
      });

      stream
        .pipe(
          bucketFile.createWriteStream({
            metadata: {
              contentType: file.mimetype,
            },
          }),
        )
        .on('error', (error) => {
          reject(error);
        })
        .on('finish', () => {
          resolve(fullPath);
        });
    });
  };

  uploadFile = async (params: {
    file: Promise<UploadFile>;
    userId: string;
    type: 'user' | 'post';
    entityId?: string;
  }): Promise<string> => {
    let path = '';
    switch (params.type) {
      case 'user':
        path = `users/${params.userId}/`;
        break;
      case 'post':
        path = `posts/${params.entityId}/`;
    }

    const filePromise = await params.file;
    const filePath = await this.uploadFileToStorage(filePromise, path);
    const { filename, mimetype } = filePromise;
    const [createdFile] = await this.server.db
      .insert(filesTable)
      .values({
        fileName: filename,
        mimeType: mimetype,
        path: filePath,
        originalName: filename,
        uploadedById: params.userId,
      })
      .returning();

    return this.makeFullUrl(createdFile.path);
  };

  deleteFile = async (id: string): Promise<void> => {
    const [dbFile] = await this.server.db.select().from(filesTable).where(eq(filesTable.id, id));

    void this.bucket.file(dbFile.path).delete();

    void this.server.db.delete(filesTable).where(eq(filesTable.id, id));
  };

  makeFullUrl(filePath: string): string {
    return `https://storage.googleapis.com/${this.server.config.STORAGE_BUCKET}/${filePath}`;
  }

  async generateSignedUrl(lessonId: string) {
    const expires = 60 * 1000 * 30; // 30 minutes
    const filePath = `dashboard/recordings/${lessonId}.mp4`;
    const bucketUrl = this.makeFullUrl(filePath);

    const [signedUrl] = await this.bucket.file(filePath).getSignedUrl({
      version: 'v4',
      contentType: 'video/mp4',
      action: 'write',
      expires: Date.now() + expires,
    });

    return { signedUrl, bucketUrl };
  }
}

const fileManagerPlugin: FastifyPluginAsync = fp(
  async (server: FastifyInstance, _options: FastifyPluginOptions) => {
    server.decorate('fileManager', new FileManager(server));
  },
);

export default fileManagerPlugin;
