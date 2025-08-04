import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { filesTable } from '@/db/schemas/files';
import type { UploadFile } from '@/types';
import { type Bucket, Storage } from '@google-cloud/storage';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

const allowedFileExtensions = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.pdf',
  '.docx',
  '.ppt',
  '.zip',
];

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

  private uploadFileToStorage = (file: UploadFile): Promise<string> => {
    return new Promise((resolve, reject) => {
      const hash = createHash('md5');
      const fullPath = `${hash
        .update(file.filename + Date.now())
        .digest('hex')}${extname(file.filename)}`;

      if (!allowedFileExtensions.includes(extname(file.filename))) {
        reject(new Error('File extension not allowed'));
        return;
      }

      const bucketFile = this.bucket.file(fullPath);
      const bucketStream = bucketFile.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      let uploadedSize = 0;
      const fileStream = file.createReadStream();

      const cleanup = () => {
        fileStream.destroy();
        bucketStream.destroy();
      };

      fileStream.on('data', (chunk: Buffer) => {
        uploadedSize += chunk.length;

        if (uploadedSize > this.maxFileSize) {
          cleanup();
          reject(
            new Error(
              `File size exceeds ${(this.maxFileSize / 1024 / 1024).toFixed(0)}MB limit. File size: ${(uploadedSize / 1024 / 1024).toFixed(2)}MB`,
            ),
          );
          return;
        }
      });

      fileStream.on('error', (error) => {
        cleanup();
        reject(error);
      });

      bucketStream.on('error', (error) => {
        cleanup();
        reject(error);
      });

      bucketStream.on('finish', () => {
        resolve(fullPath);
      });

      fileStream.pipe(bucketStream);
    });
  };

  uploadFile = async (params: {
    file: Promise<UploadFile>;
    userId: string;
  }): Promise<string> => {
    let filePromise: UploadFile;
    try {
      filePromise = await params.file;
    } catch (error) {
      throw new Error(
        `Failed to receive file upload: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    let filePath: string;
    try {
      filePath = await this.uploadFileToStorage(filePromise);
    } catch (error) {
      throw new Error(
        `Failed to upload file to storage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

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
}

const fileManagerPlugin: FastifyPluginAsync = fp(
  async (server: FastifyInstance, _options: FastifyPluginOptions) => {
    server.decorate('fileManager', new FileManager(server));
  },
);

export default fileManagerPlugin;
