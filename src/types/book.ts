import { Chapter } from "./chapter";
import { CondensingLevel } from "./condensingOptions";

export enum BookStatus {
  uploading = "uploading",
  queued = "queued",
  processing = "processing",
  completed = "completed",
  failed = "failed",
}

export interface Book {
  readonly bookId: string;
  readonly userId: string;
  readonly messageId: string;
  readonly chatId: string;
  originalUrl: string;
  condensedUrl?: string;
  downloadUrl?: string;
  title: string;
  author?: string;
  pageCount: number;
  condensingLevel: CondensingLevel;
  status: BookStatus;
  progress: number;
  currentStep: string;
  chapters: Chapter[];
  error?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}
