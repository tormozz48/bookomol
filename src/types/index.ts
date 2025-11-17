export interface Book {
  bookId: string;
  userId: string;
  messageId: string;
  chatId: string;
  originalUrl: string;
  condensedUrl?: string;
  downloadUrl?: string;
  title: string;
  author?: string;
  pageCount: number;
  condensingLevel: "light" | "medium" | "heavy";
  status: "uploading" | "queued" | "processing" | "completed" | "failed";
  progress: number;
  currentStep: string;
  chapters: Chapter[];
  error?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface Chapter {
  chapterId: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  isEssential: boolean;
  originalUrl?: string;
  condensedUrl?: string;
  status: "pending" | "processing" | "completed" | "skipped";
}

export interface Session {
  sessionId: string;
  userId: string;
  chatId: string;
  state: "awaiting_level" | "awaiting_pdf" | "processing";
  condensingLevel?: "light" | "medium" | "heavy";
  bookId?: string;
  createdAt: string;
  expiresAt: string;
}

export interface ProcessingMessage {
  bookId: string;
  userId: string;
  action: "process_book" | "extract_chapters" | "condense_chapter" | "combine_chapters";
  data: any;
}

export interface ProgressMessage {
  bookId: string;
  userId: string;
  chatId: string;
  messageId: string;
  progress: number;
  status: string;
  currentStep: string;
}

export interface CondensingOptions {
  level: "light" | "medium" | "heavy";
  preserveCodeExamples?: boolean;
}

export interface ChapterInfo {
  title: string;
  startPage: number;
  endPage: number;
  content?: string;
  isEssential?: boolean;
}