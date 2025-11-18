import { CondensingLevel } from "./condensingOptions";

export enum SessionState {
  awaitingLevel = "awaiting_level",
  awaitingPdf = "awaiting_pdf",
  processing = "processing",
}

export interface Session {
  readonly sessionId: string;
  readonly userId: string;
  readonly chatId: string;
  readonly bookId?: string;
  state: SessionState;
  condensingLevel?: CondensingLevel;
  createdAt: string;
  expiresAt: string;
}
