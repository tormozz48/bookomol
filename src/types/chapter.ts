export enum ChapterStatus {
  pending = "pending",
  processing = "processing",
  completed = "completed",
  skipped = "skipped",
}

export interface Chapter {
  readonly chapterId: string;
  readonly title: string;
  readonly pageStart: number;
  readonly pageEnd: number;
  readonly isEssential: boolean;
  originalUrl?: string;
  condensedUrl?: string;
  status: ChapterStatus;
}

export interface ChapterInfo {
  readonly title: string;
  readonly startPage: number;
  readonly endPage: number;
  content?: string;
  isEssential?: boolean;
}
