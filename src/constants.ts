export const tableNames = {
  books: "Books",
  sessions: "Sessions",
} as const;

export const bucketNames = {
  pdfs: "pdfs",
} as const;

export const queueNames = {
  processing: "processing",
  progress: "progress",
} as const;

export const functionNames = {
  queueProcessor: "QueueProcessor",
  pdfProcessor: "PdfProcessor",
  progressHandler: "ProgressHandler",
  botHandler: "BotHandler",
} as const;
