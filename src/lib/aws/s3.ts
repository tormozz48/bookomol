import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "../logger";
import { bucketNames } from "../../constants";

const client = new S3Client({});

export class S3Service {
  private bucketName = bucketNames.pdfs;

  public async uploadFile(key: string, body: Buffer, contentType?: string): Promise<string> {
    return this.handlError(
      key,
      async () => {
        await client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: body,
            ContentType: contentType || "application/octet-stream",
          })
        );
        const url = `s3://${this.bucketName}/${key}`;
        logger.info("File uploaded to S3", { key, url });
        return url;
      },
      "Failed to upload file to S3"
    );
  }

  public async downloadFile(key: string): Promise<Buffer> {
    return this.handlError(
      key,
      async () => {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          })
        );
        const chunks: Uint8Array[] = [];
        if (response.Body) {
          const stream = response.Body as any;
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
        }

        const buffer = Buffer.concat(chunks);
        logger.info("File downloaded from S3", { key, size: buffer.length });
        return buffer;
      },
      "Failed to download file from S3"
    );
  }

  public async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.handlError(
      key,
      async () => {
        const url = await getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          }),
          { expiresIn }
        );
        logger.info("Presigned URL generated", { key, expiresIn });
        return url;
      },
      "Failed to generate presigned URL"
    );
  }

  public async deleteFile(key: string): Promise<void> {
    return this.handlError(
      key,
      async () => {
        await client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          })
        );
        logger.info("File deleted from S3", { key });
      },
      "Failed to delete file from S3"
    );
  }

  public async fileExists(key: string): Promise<boolean> {
    return this.handlError(
      key,
      async () => {
        await client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          })
        );
        return true;
      },
      "Failed to check file existence"
    );
  }

  private handlError<K, T>(key: K, fn: () => Promise<T>, message: string) {
    try {
      return fn();
    } catch (error) {
      logger.error(message, { error, key });
      throw error;
    }
  }
}
