import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Book, Session } from "../../types";
import { logger } from "../logger";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export class DynamoDBService {
  constructor(
    private booksTable: string,
    private sessionsTable: string
  ) {}

  // Book operations
  async getBook(bookId: string): Promise<Book | null> {
    try {
      const command = new GetCommand({
        TableName: this.booksTable,
        Key: { bookId },
      });

      const result = await docClient.send(command);
      return result.Item as Book || null;
    } catch (error) {
      logger.error("Failed to get book", { bookId, error });
      throw error;
    }
  }

  async createBook(book: Book): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.booksTable,
        Item: book,
      });

      await docClient.send(command);
      logger.info("Book created", { bookId: book.bookId });
    } catch (error) {
      logger.error("Failed to create book", { bookId: book.bookId, error });
      throw error;
    }
  }

  async updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
    try {
      const updateExpression = Object.keys(updates)
        .map(key => `#${key} = :${key}`)
        .join(", ");

      const expressionAttributeNames = Object.keys(updates).reduce(
        (acc, key) => ({ ...acc, [`#${key}`]: key }),
        {}
      );

      const expressionAttributeValues = Object.entries(updates).reduce(
        (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
        {}
      );

      const command = new UpdateCommand({
        TableName: this.booksTable,
        Key: { bookId },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await docClient.send(command);
      logger.info("Book updated", { bookId, updates });
    } catch (error) {
      logger.error("Failed to update book", { bookId, updates, error });
      throw error;
    }
  }

  async getBooksByUser(userId: string): Promise<Book[]> {
    try {
      const command = new QueryCommand({
        TableName: this.booksTable,
        IndexName: "userIndex",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: { ":userId": userId },
      });

      const result = await docClient.send(command);
      return result.Items as Book[] || [];
    } catch (error) {
      logger.error("Failed to get books by user", { userId, error });
      throw error;
    }
  }

  // Session operations
  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const command = new GetCommand({
        TableName: this.sessionsTable,
        Key: { sessionId },
      });

      const result = await docClient.send(command);
      return result.Item as Session || null;
    } catch (error) {
      logger.error("Failed to get session", { sessionId, error });
      throw error;
    }
  }

  async createSession(session: Session): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.sessionsTable,
        Item: session,
      });

      await docClient.send(command);
      logger.info("Session created", { sessionId: session.sessionId });
    } catch (error) {
      logger.error("Failed to create session", { sessionId: session.sessionId, error });
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    try {
      const updateExpression = Object.keys(updates)
        .map(key => `#${key} = :${key}`)
        .join(", ");

      const expressionAttributeNames = Object.keys(updates).reduce(
        (acc, key) => ({ ...acc, [`#${key}`]: key }),
        {}
      );

      const expressionAttributeValues = Object.entries(updates).reduce(
        (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
        {}
      );

      const command = new UpdateCommand({
        TableName: this.sessionsTable,
        Key: { sessionId },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await docClient.send(command);
      logger.info("Session updated", { sessionId, updates });
    } catch (error) {
      logger.error("Failed to update session", { sessionId, updates, error });
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.sessionsTable,
        Key: { sessionId },
      });

      await docClient.send(command);
      logger.info("Session deleted", { sessionId });
    } catch (error) {
      logger.error("Failed to delete session", { sessionId, error });
      throw error;
    }
  }
}