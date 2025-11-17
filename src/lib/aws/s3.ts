import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "../logger";

const client = new S3Client({});

export class S3Service {
  constructor(private bucketName: string) {}

  async uploadFile(key: string, body: Buffer, contentType?: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType || "application/octet-stream",
      });

      await client.send(command);
      const url = `s3://${this.bucketName}/${key}`;
      
      logger.info("File uploaded to S3", { key, url });
      return url;
    } catch (error) {
      logger.error("Failed to upload file to S3", { key, error });
      throw error;
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await client.send(command);
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
    } catch (error) {
      logger.error("Failed to download file from S3", { key, error });
      throw error;
    }
  }

  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(client, command, { expiresIn });
      logger.info("Presigned URL generated", { key, expiresIn });
      return url;
    } catch (error) {
      logger.error("Failed to generate presigned URL", { key, error });
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await client.send(command);
      logger.info("File deleted from S3", { key });
    } catch (error) {
      logger.error("Failed to delete file from S3", { key, error });
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NoSuchKey") {
        return false;
      }
      logger.error("Failed to check file existence", { key, error });
      throw error;
    }
  }
}