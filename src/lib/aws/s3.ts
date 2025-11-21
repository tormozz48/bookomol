import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucketNames } from "../../constants";

const client = new S3Client({});

export async function uploadFile(key: string, body: Buffer, contentType?: string): Promise<string> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucketNames.pdfs,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    })
  );
  return `s3://${bucketNames.pdfs}/${key}`;
}

export async function downloadFile(key: string): Promise<Buffer> {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketNames.pdfs,
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
  return Buffer.concat(chunks);
}

export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucketNames.pdfs,
      Key: key,
    }),
    { expiresIn }
  );
  return url;
}

export async function deleteFile(key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketNames.pdfs,
      Key: key,
    })
  );
}

export async function fileExists(key: string): Promise<boolean> {
  await client.send(
    new GetObjectCommand({
      Bucket: bucketNames.pdfs,
      Key: key,
    })
  );
  return true;
}
