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
import { tableNames } from "../../constants";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function getBook(bookId: string): Promise<Book | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableNames.books,
      Key: { bookId },
    })
  );
  return (result.Item as Book) || null;
}

export async function createBook(book: Book): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: tableNames.books,
      Item: book,
    })
  );
}

export async function updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: tableNames.books,
      Key: { bookId },
      ...getUpdateAttributes(updates),
    })
  );
}

export async function getBooksByUser(userId: string): Promise<Book[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableNames.books,
      IndexName: "userIndex",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: { ":userId": userId },
    })
  );
  return (result.Items as Book[]) || [];
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableNames.sessions,
      Key: { sessionId },
    })
  );
  return (result.Item as Session) || null;
}

export async function createSession(session: Session): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: tableNames.sessions,
      Item: session,
    })
  );
}

export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: tableNames.sessions,
      Key: { sessionId },
      ...getUpdateAttributes(updates),
    })
  );
}

export async function deleteSession(sessionId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: tableNames.sessions,
      Key: { sessionId },
    })
  );
}

function getUpdateAttributes<T>(updates: Partial<T>): {
  UpdateExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, any>;
} {
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

  return {
    UpdateExpression: `SET ${updateExpression}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };
}
