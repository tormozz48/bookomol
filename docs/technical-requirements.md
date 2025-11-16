# Bookomol - PDF Book Condensing Telegram Bot
## Technical Requirements Document

### 1. Introduction

This document outlines the technical requirements, specifications, and implementation details for the Bookomol PDF book condensing Telegram bot system.

### 2. System Requirements

#### 2.1 Runtime Environment
- **Node.js**: v20.x LTS
- **TypeScript**: v5.x
- **Operating System**: Amazon Linux 2 (Lambda runtime)
- **Memory Requirements**: 
  - Bot Handler: 512MB
  - Chapter Splitter: 3GB
  - Chapter Processor: 1GB
  - Book Assembler: 2GB

#### 2.2 Development Environment
- **Docker**: v24.x
- **Docker Compose**: v2.x
- **PostgreSQL**: v15.x
- **MinIO**: Latest stable
- **LocalStack**: Latest stable

### 3. API Specifications

#### 3.1 Telegram Bot Webhook API

##### 3.1.1 Webhook Endpoint
```typescript
POST /webhook/{bot-token}

Headers:
  Content-Type: application/json
  X-Telegram-Bot-Api-Secret-Token: {secret}

Request Body: TelegramUpdate
Response: 200 OK | 400 Bad Request
```

##### 3.1.2 Telegram Update Types
```typescript
interface TelegramUpdate {
  update_id: number;
  message?: Message;
  callback_query?: CallbackQuery;
}

interface Message {
  message_id: number;
  from: User;
  chat: Chat;
  text?: string;
  document?: Document;
  command?: string;
}
```

#### 3.2 Internal Lambda APIs

##### 3.2.1 S3 Event Handler
```typescript
interface S3EventRecord {
  eventVersion: string;
  eventSource: "aws:s3";
  s3: {
    bucket: {
      name: string;
      arn: string;
    };
    object: {
      key: string;
      size: number;
      eTag: string;
    };
  };
}
```

##### 3.2.2 SQS Message Format
```typescript
interface ProcessingStatusMessage {
  jobId: string;
  userId: string;
  bookId: string;
  status: 'started' | 'progress' | 'completed' | 'failed';
  stage: 'splitting' | 'processing' | 'assembling';
  progress?: {
    current: number;
    total: number;
  };
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}
```

#### 3.3 Google Gemini API Integration

##### 3.3.1 AI SDK Configuration
```typescript
interface GeminiConfig {
  apiKey: string;
  model: 'gemini-1.5-pro' | 'gemini-1.5-flash';
  maxTokens: number;
  temperature: 0.3;
  topP: 0.8;
}
```

##### 3.3.2 Chapter Analysis Request
```typescript
interface ChapterAnalysisRequest {
  content: string;
  prompt: string;
  systemPrompt: string;
}

interface ChapterAnalysisResponse {
  chapters: Array<{
    number: number;
    title: string;
    startPage: number;
    endPage: number;
    isLowValue: boolean;
    reason?: string;
  }>;
}
```

##### 3.3.3 Content Condensation Request
```typescript
interface CondensationRequest {
  chapterContent: string;
  condensationLevel: 'brief' | 'standard' | 'comprehensive';
  bookContext: {
    title: string;
    author: string;
    genre: string;
  };
}

interface CondensationResponse {
  condensedContent: string;
  keyPoints: string[];
  preservedElements: string[];
  compressionRatio: number;
}
```

### 4. Data Specifications

#### 4.1 Database Schema

##### 4.1.1 SQL Migrations
```sql
-- Version: 001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE job_status AS ENUM (
  'pending',
  'splitting', 
  'processing',
  'assembling',
  'completed',
  'failed'
);

CREATE TYPE condensation_level AS ENUM (
  'brief',
  'standard', 
  'comprehensive'
);

-- Users table with indexes
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  language_code VARCHAR(10) DEFAULT 'en',
  monthly_quota INTEGER DEFAULT 10,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_created_at ON users(created_at);
```

##### 4.1.2 Data Models (TypeScript)
```typescript
// User entity
@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  telegramId: number;

  @Column({ nullable: true })
  username?: string;

  @Column({ default: 10 })
  monthlyQuota: number;

  @Column({ default: false })
  isPremium: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Book, book => book.user)
  books: Book[];
}
```

#### 4.2 S3 Storage Specifications

##### 4.2.1 Bucket Configuration
```yaml
BucketName: bookomol-storage-{environment}
Versioning: Enabled
Encryption: AES256
PublicAccess: Blocked

LifecycleRules:
  - Id: DeleteOriginalBooks
    Status: Enabled
    ExpirationInDays: 1
    Prefix: original/
    
  - Id: DeleteProcessedBooks  
    Status: Enabled
    ExpirationInDays: 7
    Prefix: final/

CORS:
  - AllowedOrigins: ["*"]
    AllowedMethods: ["GET", "PUT"]
    AllowedHeaders: ["*"]
    MaxAge: 3600
```

##### 4.2.2 Object Metadata
```typescript
interface S3ObjectMetadata {
  userId: string;
  jobId: string;
  bookId: string;
  uploadDate: string;
  originalFilename: string;
  fileSize: number;
  contentType: 'application/pdf';
}
```

### 5. Technical Constraints

#### 5.1 Performance Constraints
- **Lambda Cold Start**: < 3 seconds
- **API Response Time**: < 500ms (p95)
- **File Upload Speed**: > 1MB/s
- **Concurrent Jobs**: Max 10 per user
- **Queue Processing Delay**: < 30 seconds

#### 5.2 Resource Constraints
- **Lambda Timeout**: 15 minutes max
- **Lambda Memory**: 10GB max
- **S3 Object Size**: 5GB max (multipart)
- **API Gateway Timeout**: 30 seconds
- **RDS Connections**: 100 max

#### 5.3 Rate Limits
- **Telegram Bot API**: 30 messages/second
- **Google Gemini API**: 60 requests/minute
- **S3 PUT Requests**: 3,500/second
- **Lambda Concurrency**: 1,000 default

### 6. Security Requirements

#### 6.1 Authentication & Authorization
```typescript
// Telegram webhook validation
function validateWebhook(req: Request): boolean {
  const token = req.headers['x-telegram-bot-api-secret-token'];
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(process.env.TELEGRAM_SECRET_TOKEN)
  );
}

// S3 presigned URL generation
function generatePresignedUrl(key: string, expires: number = 3600): string {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: expires
  });
}
```

#### 6.2 Data Encryption
- **In Transit**: TLS 1.2+ required
- **At Rest**: AES-256 encryption
- **Secrets**: AWS Secrets Manager
- **API Keys**: Environment variables in Lambda

#### 6.3 Input Validation
```typescript
// Zod schemas for validation
const FileUploadSchema = z.object({
  filename: z.string().regex(/^[\w\-. ]+\.pdf$/i),
  size: z.number().min(100 * 1024).max(100 * 1024 * 1024),
  contentType: z.literal('application/pdf')
});

const CondensationRequestSchema = z.object({
  level: z.enum(['brief', 'standard', 'comprehensive']),
  bookId: z.string().uuid()
});
```

### 7. Integration Requirements

#### 7.1 AWS SDK Configuration
```typescript
// AWS SDK v3 configuration
import { S3Client } from "@aws-sdk/client-s3";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { SQSClient } from "@aws-sdk/client-sqs";

const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.IS_LOCAL ? {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  } : undefined
};

export const s3Client = new S3Client(config);
export const lambdaClient = new LambdaClient(config);
export const sqsClient = new SQSClient(config);
```

#### 7.2 Database Connection
```typescript
// Sequelize configuration
export const sequelizeConfig = {
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'development'
};
```

#### 7.3 Logging Configuration
```typescript
// Pino logger setup
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: ['password', 'apiKey', 'token'],
  serializers: {
    error: pino.stdSerializers.err,
    request: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      userId: req.userId
    })
  }
});
```

### 8. Build & Deployment

#### 8.1 Build Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  build: {
    target: 'node20',
    outDir: 'dist',
    rollupOptions: {
      input: {
        botHandler: 'src/handlers/bot.ts',
        chapterSplitter: 'src/handlers/splitter.ts',
        chapterProcessor: 'src/handlers/processor.ts',
        bookAssembler: 'src/handlers/assembler.ts'
      },
      output: {
        format: 'cjs',
        entryFileNames: '[name].js'
      },
      external: [
        'aws-sdk',
        '@aws-sdk/client-s3',
        '@aws-sdk/client-lambda',
        '@aws-sdk/client-sqs',
        'pg',
        'pg-hstore'
      ]
    }
  },
  plugins: [nodeResolve()]
});
```

#### 8.2 Infrastructure as Code (Pulumi)
```typescript
// index.ts - Pulumi program
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// S3 Bucket
const bucket = new aws.s3.Bucket("bookomol-storage", {
  acl: "private",
  versioning: { enabled: true },
  serverSideEncryptionConfiguration: {
    rule: {
      applyServerSideEncryptionByDefault: {
        sseAlgorithm: "AES256"
      }
    }
  }
});

// Lambda Function
const botHandler = new aws.lambda.Function("bot-handler", {
  code: new pulumi.asset.FileArchive("./dist/bot-handler.zip"),
  runtime: "nodejs20.x",
  handler: "botHandler.handler",
  memorySize: 512,
  timeout: 30,
  environment: {
    variables: {
      TELEGRAM_BOT_TOKEN: config.require("telegramBotToken"),
      S3_BUCKET: bucket.id,
      DB_HOST: database.address
    }
  }
});
```

### 9. Quality Assurance

#### 9.1 Code Quality Standards
- **Code Coverage**: Target 80% minimum
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier configuration
- **Type Safety**: Strict TypeScript mode

#### 9.2 Testing Approach
- Unit tests for business logic
- Integration tests for AWS services
- End-to-end tests for critical user flows
- Performance testing for scalability validation

#### 9.3 Testing Tools
- **Framework**: Jest for TypeScript
- **Mocking**: AWS SDK mocks
- **Load Testing**: k6 or similar tools
- **CI Integration**: Automated test runs

### 10. Monitoring & Observability

#### 10.1 CloudWatch Metrics
```typescript
// Custom metrics
const metrics = {
  BookProcessingStarted: new CloudWatch.Metric({
    namespace: 'Bookomol',
    metricName: 'BookProcessingStarted',
    unit: 'Count'
  }),
  BookProcessingCompleted: new CloudWatch.Metric({
    namespace: 'Bookomol',
    metricName: 'BookProcessingCompleted',
    unit: 'Count'
  }),
  BookProcessingFailed: new CloudWatch.Metric({
    namespace: 'Bookomol',
    metricName: 'BookProcessingFailed',
    unit: 'Count'
  }),
  ProcessingDuration: new CloudWatch.Metric({
    namespace: 'Bookomol',
    metricName: 'ProcessingDuration',
    unit: 'Milliseconds'
  })
};
```

#### 10.2 Structured Logging
```typescript
// Log formats
interface LogEntry {
  timestamp: string;
  level: string;
  requestId: string;
  userId?: string;
  jobId?: string;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}
```

### 11. Error Handling

#### 11.1 Error Codes
```typescript
export enum ErrorCode {
  // 4xx Client Errors
  INVALID_FILE_FORMAT = 'E1001',
  FILE_TOO_LARGE = 'E1002',
  QUOTA_EXCEEDED = 'E1003',
  INVALID_COMMAND = 'E1004',
  
  // 5xx Server Errors
  AI_API_ERROR = 'E2001',
  DATABASE_ERROR = 'E2002',
  S3_ERROR = 'E2003',
  LAMBDA_TIMEOUT = 'E2004',
  PROCESSING_FAILED = 'E2005'
}
```

#### 11.2 Error Recovery
```typescript
// Retry configuration
const retryConfig = {
  maxAttempts: 3,
  backoffMultiplier: 2,
  initialDelay: 1000,
  maxDelay: 10000,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ServiceUnavailable',
    'TooManyRequests'
  ]
};
```

### 12. Development Workflow

#### 12.1 Git Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: npm run deploy:prod
```

#### 12.2 Local Development
```bash
# Development commands
npm run dev         # Start local development
npm run test:watch  # Run tests in watch mode
npm run db:migrate  # Run database migrations
npm run db:seed     # Seed development data
npm run logs        # Stream local logs
npm run deploy:dev  # Deploy to dev environment