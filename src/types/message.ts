export enum MessageAction {
  processBook = "process_book",
  extractChapters = "extract_chapters",
  condenseChapter = "condense_chapter",
  combineChapters = "combine_chapters",
}

export interface ProcessingMessage<T extends MessageAction> {
  readonly bookId: string;
  readonly userId: string;
  action: T;
  data: T extends MessageAction.extractChapters ? { chapterId: string } : {};
}

export interface ProgressMessage {
  readonly bookId: string;
  readonly userId: string;
  readonly chatId: string;
  readonly messageId: string;
  progress: number;
  status: string;
  currentStep: string;
}
