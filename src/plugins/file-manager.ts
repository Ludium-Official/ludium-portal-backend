import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { filesTable } from '@/db/schemas/files';
import type { UploadFile } from '@/types';
import { type Bucket, Storage } from '@google-cloud/storage';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
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
  ...videoExtensions,
];

export class FileManager {
  server: FastifyInstance;
  storage: Storage;
  bucket: Bucket;
  maxFileSize: number;
  maxVideoSize: number;

  constructor(server: FastifyInstance) {
    this.server = server;
    this.storage = new Storage();
    this.bucket = this.storage.bucket(server.config.STORAGE_BUCKET);
    this.maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
    this.maxVideoSize = 100 * 1024 * 1024; // 100MB in bytes
  }

  private isVideoFile(filename: string): boolean {
    const ext = extname(filename).toLowerCase();
    return videoExtensions.includes(ext);
  }

  private uploadFileToStorage = (file: UploadFile, directory?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const hash = createHash('md5');
      const fileName = `${hash
        .update(file.filename + Date.now())
        .digest('hex')}${extname(file.filename)}`;
      const fullPath = directory ? `${directory}/${fileName}` : fileName;

      if (!allowedFileExtensions.includes(extname(file.filename))) {
        reject(new Error('File extension not allowed'));
        return;
      }

      const isVideo = this.isVideoFile(file.filename);
      const maxSize = isVideo ? this.maxVideoSize : this.maxFileSize;
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);

      const bucketFile = this.bucket.file(fullPath);

      let uploadedSize = 0;
      let cleaned = false;
      let fileStream: Readable | null = null;
      let bucketStream: Writable | null = null;

      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;

        if (fileStream && !fileStream.destroyed) {
          fileStream.destroy();
        }
        if (bucketStream && !bucketStream.destroyed) {
          bucketStream.destroy();
        }
      };

      const timeout = isVideo ? 120000 : 30000;
      const uploadTimeout = setTimeout(() => {
        cleanup();
        reject(new Error('Upload timeout'));
      }, timeout);

      try {
        fileStream = file.createReadStream();

        bucketStream = bucketFile.createWriteStream({
          metadata: {
            contentType: file.mimetype,
          },
          resumable: false,
        });

        fileStream.on('data', (chunk: Buffer) => {
          uploadedSize += chunk.length;

          if (uploadedSize > maxSize) {
            clearTimeout(uploadTimeout);
            cleanup();
            reject(
              new Error(
                `${isVideo ? 'Video' : 'File'} size exceeds ${maxSizeMB}MB limit. File size: ${(uploadedSize / 1024 / 1024).toFixed(2)}MB`,
              ),
            );
          }
        });

        fileStream.on('error', (error) => {
          clearTimeout(uploadTimeout);
          cleanup();
          reject(error);
        });

        bucketStream.on('error', (error) => {
          clearTimeout(uploadTimeout);
          cleanup();
          reject(error);
        });

        bucketStream.on('finish', () => {
          clearTimeout(uploadTimeout);
          cleanup();
          resolve(fullPath);
        });

        fileStream.pipe(bucketStream);
      } catch (error) {
        clearTimeout(uploadTimeout);
        cleanup();
        reject(error);
      }
    });
  };

  uploadFile = async (params: {
    file: Promise<UploadFile>;
    userId: string;
    directory?: string;
  }): Promise<string> => {
    const filePromise = await params.file;
    const filePath = await this.uploadFileToStorage(filePromise, params.directory);

    const { filename, mimetype } = filePromise;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.userId,
    );

    const [createdFile] = await this.server.db
      .insert(filesTable)
      .values({
        fileName: filename,
        mimeType: mimetype,
        path: filePath,
        originalName: filename,
        uploadedById: isUUID ? params.userId : null,
      })
      .returning();

    return this.makeFullUrl(createdFile.path);
  };

  deleteFile = async (id: string): Promise<void> => {
    const [dbFile] = await this.server.db.select().from(filesTable).where(eq(filesTable.id, id));

    if (!dbFile) {
      return;
    }

    try {
      await this.bucket.file(dbFile.path).delete();
    } catch (error) {
      // Ignore 404 errors - file already deleted
      if (!(error instanceof Error && 'code' in error && error.code === 404)) {
        throw error;
      }
    }

    await this.server.db.delete(filesTable).where(eq(filesTable.id, id));
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
