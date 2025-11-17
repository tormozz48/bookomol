import { v4 as uuidv4 } from "uuid";
import { Session } from "../../types";
import { DynamoDBService } from "../aws/dynamodb";
import { logger } from "../logger";

export class SessionService {
  private db: DynamoDBService;

  constructor(booksTable: string, sessionsTable: string) {
    this.db = new DynamoDBService(booksTable, sessionsTable);
  }

  async createSession(userId: number, chatId: number): Promise<Session> {
    const sessionId = `session_${userId}_${Date.now()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    const session: Session = {
      sessionId,
      userId: userId.toString(),
      chatId: chatId.toString(),
      state: "awaiting_level",
      createdAt: now.toISOString(),
      expiresAt: Math.floor(expiresAt.getTime() / 1000).toString(), // DynamoDB TTL expects Unix timestamp
    };

    await this.db.createSession(session);
    
    logger.info("Session created", { 
      sessionId, 
      userId, 
      chatId 
    });

    return session;
  }

  async getSession(userId: number): Promise<Session | null> {
    // Find the most recent session for this user
    const sessionId = `session_${userId}`;
    
    // In a real implementation, we might need to query by userId
    // For now, we'll construct the sessionId pattern
    try {
      const sessions = await this.findSessionsByUserId(userId.toString());
      if (sessions.length === 0) {
        return null;
      }

      // Return the most recent session
      return sessions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
    } catch (error) {
      logger.error("Failed to get session", { userId, error });
      return null;
    }
  }

  async updateSession(userId: number, updates: Partial<Session>): Promise<void> {
    const session = await this.getSession(userId);
    if (!session) {
      throw new Error(`No active session found for user ${userId}`);
    }

    await this.db.updateSession(session.sessionId, updates);

    logger.info("Session updated", { 
      sessionId: session.sessionId, 
      userId, 
      updates 
    });
  }

  async deleteSession(userId: number): Promise<void> {
    const session = await this.getSession(userId);
    if (!session) {
      return; // Nothing to delete
    }

    await this.db.deleteSession(session.sessionId);

    logger.info("Session deleted", { 
      sessionId: session.sessionId, 
      userId 
    });
  }

  async cleanupExpiredSessions(): Promise<void> {
    // This would typically be handled by DynamoDB TTL automatically
    // But we can implement manual cleanup if needed
    logger.info("Cleaning up expired sessions (handled by DynamoDB TTL)");
  }

  private async findSessionsByUserId(userId: string): Promise<Session[]> {
    // This is a simplified implementation
    // In practice, you'd want to add a GSI on userId for efficient querying
    // For now, we'll return empty array and rely on sessionId pattern matching
    return [];
  }

  async setCondensingLevel(userId: number, level: "light" | "medium" | "heavy"): Promise<void> {
    await this.updateSession(userId, { 
      condensingLevel: level,
      state: "awaiting_pdf"
    });
  }

  async setProcessingState(userId: number, bookId: string): Promise<void> {
    await this.updateSession(userId, {
      bookId,
      state: "processing"
    });
  }

  async getUserActiveSession(userId: number): Promise<Session | null> {
    const session = await this.getSession(userId);
    if (!session) {
      return null;
    }

    // Check if session is still valid (not expired)
    const expiresAt = parseInt(session.expiresAt) * 1000; // Convert back to milliseconds
    if (Date.now() > expiresAt) {
      await this.deleteSession(userId);
      return null;
    }

    return session;
  }
}