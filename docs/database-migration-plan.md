# Database Migration Plan - Sequelize Setup

## Overview

This document outlines the plan to set up Sequelize ORM for the Bookomol project with specific requirements:

- Integer IDs instead of UUIDs
- camelCase column names
- No database enums (use string fields with TypeScript validation)
- Simplified connection and migration module

## Key Changes from Original Schema

### 1. ID Fields

- Change from `UUID` to `INTEGER AUTO_INCREMENT`
- All foreign keys will be integers

### 2. Column Naming Convention

- `telegram_id` → `telegramId`
- `first_name` → `firstName`
- `last_name` → `lastName`
- `language_code` → `languageCode`
- `monthly_quota` → `monthlyQuota`
- `is_premium` → `isPremium`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

### 3. Enum Replacements

- `job_status` enum → `status` string field with TypeScript validation
- `condensation_level` enum → `condensationLevel` string field with TypeScript validation

## Database Schema Updates

### Users Table

```typescript
{
  id: INTEGER (Primary Key, Auto Increment)
  telegramId: BIGINT (Unique, Not Null)
  username: VARCHAR(255) (Nullable)
  firstName: VARCHAR(255) (Nullable)
  lastName: VARCHAR(255) (Nullable)
  languageCode: VARCHAR(10) (Default: 'en')
  monthlyQuota: INTEGER (Default: 10)
  isPremium: BOOLEAN (Default: false)
  createdAt: TIMESTAMP WITH TIME ZONE
  updatedAt: TIMESTAMP WITH TIME ZONE
}
```

### Books Table

```typescript
{
  id: INTEGER (Primary Key, Auto Increment)
  userId: INTEGER (Foreign Key → users.id)
  title: VARCHAR(500) (Not Null)
  author: VARCHAR(255) (Nullable)
  originalFilename: VARCHAR(500) (Not Null)
  fileSize: INTEGER (Not Null)
  pageCount: INTEGER (Nullable)
  s3Key: VARCHAR(500) (Unique, Not Null)
  processedS3Key: VARCHAR(500) (Nullable)
  createdAt: TIMESTAMP WITH TIME ZONE
  updatedAt: TIMESTAMP WITH TIME ZONE
}
```

### ProcessingJobs Table

```typescript
{
  id: INTEGER (Primary Key, Auto Increment)
  jobId: VARCHAR(255) (Unique, Not Null)
  userId: INTEGER (Foreign Key → users.id)
  bookId: INTEGER (Foreign Key → books.id)
  status: VARCHAR(50) (Not Null) // 'pending', 'splitting', 'processing', 'assembling', 'completed', 'failed'
  condensationLevel: VARCHAR(50) (Not Null) // 'brief', 'standard', 'comprehensive'
  progress: INTEGER (Default: 0)
  totalChapters: INTEGER (Nullable)
  processedChapters: INTEGER (Default: 0)
  error: TEXT (Nullable)
  startedAt: TIMESTAMP WITH TIME ZONE (Nullable)
  completedAt: TIMESTAMP WITH TIME ZONE (Nullable)
  createdAt: TIMESTAMP WITH TIME ZONE
  updatedAt: TIMESTAMP WITH TIME ZONE
}
```

### UserQuota Table

```typescript
{
  id: INTEGER (Primary Key, Auto Increment)
  userId: INTEGER (Foreign Key → users.id)
  month: VARCHAR(7) (Not Null) // Format: 'YYYY-MM'
  booksProcessed: INTEGER (Default: 0)
  createdAt: TIMESTAMP WITH TIME ZONE
  updatedAt: TIMESTAMP WITH TIME ZONE
}
```

## TypeScript Type Definitions

```typescript
// Enum replacements with const assertions
export const JOB_STATUS = {
  PENDING: 'pending',
  SPLITTING: 'splitting',
  PROCESSING: 'processing',
  ASSEMBLING: 'assembling',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];

export const CONDENSATION_LEVEL = {
  BRIEF: 'brief',
  STANDARD: 'standard',
  COMPREHENSIVE: 'comprehensive'
} as const;

export type CondensationLevel = typeof CONDENSATION_LEVEL[keyof typeof CONDENSATION_LEVEL];
```

## Project Structure

```
src/
├── database/
│   ├── config.ts           # Database configuration
│   ├── connection.ts       # Simplified connection module
│   ├── models/
│   │   ├── index.ts       # Model associations and exports
│   │   ├── User.ts        # User model
│   │   ├── Book.ts        # Book model
│   │   ├── ProcessingJob.ts # ProcessingJob model
│   │   └── UserQuota.ts   # UserQuota model
│   ├── migrations/        # Sequelize migrations
│   └── types/            # TypeScript interfaces
│       └── index.ts      # Database types
```

## Implementation Steps

1. **Initialize NPM project** with TypeScript and Sequelize dependencies
2. **Create Sequelize configuration** for different environments
3. **Create connection module** with simplified interface
4. **Define TypeScript interfaces** for all models
5. **Create Sequelize models** with proper validations
6. **Generate initial migration** with the new schema
7. **Set up migration scripts** in package.json
8. **Test the setup** with basic CRUD operations

## Dependencies

### Production

- sequelize: ^6.35.0
- pg: ^8.11.0
- pg-hstore: ^2.3.4

### Development

- @types/node: ^20.0.0
- @types/sequelize: ^4.28.0
- sequelize-cli: ^6.6.0
- typescript: ^5.0.0