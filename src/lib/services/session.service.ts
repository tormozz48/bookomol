import { db } from "../aws";
import { CondensingLevel, Session, SessionState } from "../../types";
import { sessionExpiryTime } from "../../constants";

const getSessionId = (userId: number): string => `session_${userId}`;

export async function getSessionByUserId(userId: number): Promise<Session | null> {
  const sessionId = getSessionId(userId);
  return db.getSession(sessionId);
}

export async function createSession(userId: number, chatId: number): Promise<Session> {
  const sessionId = getSessionId(userId);
  const now = new Date();

  const session: Session = {
    sessionId,
    userId: userId.toString(),
    chatId: chatId.toString(),
    state: SessionState.awaitingLevel,
    createdAt: now.toISOString(),
    expiresAt: getSessionExpiryTime().toString(),
  };

  await db.createSession(session);
  return session;
}

export async function updateSession(userId: number, updates: Partial<Session>): Promise<void> {
  const session = await getSessionByUserId(userId);
  if (!session) {
    throw new Error(`No active session found for user ${userId}`);
  }
  await db.updateSession(session.sessionId, updates);
}

export async function deleteSession(userId: number): Promise<void> {
  const session = await getSessionByUserId(userId);
  if (!session) {
    return;
  }
  await db.deleteSession(session.sessionId);
}

export async function setCondensingLevel(userId: number, level: CondensingLevel): Promise<void> {
  await updateSession(userId, {
    condensingLevel: level,
    state: SessionState.awaitingPdf,
  });
}

export async function setProcessingState(userId: number, bookId: string): Promise<void> {
  await updateSession(userId, {
    bookId,
    state: SessionState.processing,
  });
}

export async function getUserActiveSession(userId: number): Promise<Session | null> {
  const session = await getSessionByUserId(userId);
  if (!session) {
    return null;
  }

  // Check if session is still valid (not expired)
  const expiresAt = parseInt(session.expiresAt) * 1000; // Convert back to milliseconds
  if (Date.now() > expiresAt) {
    await deleteSession(userId);
    return null;
  }
  return session;
}

function getSessionExpiryTime(): number {
  const now = new Date();
  return Math.floor(new Date(now.getTime() + sessionExpiryTime).getTime() / 1000);
}
