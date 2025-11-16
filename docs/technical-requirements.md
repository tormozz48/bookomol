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

For detailed database schema, migration plans, and implementation details, please refer to:

- **[Database Migration Plan](./database-migration-plan.md)** - Outlines the Sequelize setup with integer IDs, camelCase columns, and TypeScript validations
- **[Database Implementation Details](./database-implementation-details.md)** - Contains technical choices, model examples with decorators, and configuration structure

#### 4.1 S3 Storage Specifications

##### 4.1.1 Bucket Configuration

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

##### 4.1.2 Object Metadata

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

#### 8.2 Infrastructure as Code (AWS SAM)

AWS SAM (Serverless Application Model) provides the simplest way to define and deploy the serverless infrastructure for Bookomol. It uses a declarative YAML template to define all AWS resources.

##### 8.2.1 SAM Template Structure

```yaml
# template.yaml - Main SAM template
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Bookomol - PDF Book Condensing Telegram Bot

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30
    Environment:
      Variables:
        NODE_ENV: !Ref Environment
        S3_BUCKET: !Ref BookomolBucket
        DB_HOST: !GetAtt BookomolDB.Endpoint.Address
        DB_PORT: !GetAtt BookomolDB.Endpoint.Port
        QUEUE_URL: !Ref ProcessingQueue

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, prod]
  TelegramBotToken:
    Type: String
    NoEcho: true
  GeminiApiKey:
    Type: String
    NoEcho: true
  DatabasePassword:
    Type: String
    NoEcho: true

Resources:
  # S3 Bucket for file storage
  BookomolBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'bookomol-storage-${Environment}'
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      LifecycleConfiguration:
        Rules:
          - Id: DeleteOriginalBooks
            Status: Enabled
            ExpirationInDays: 1
            Prefix: original/
          - Id: DeleteProcessedBooks
            Status: Enabled
            ExpirationInDays: 7
            Prefix: final/

  # Bot Handler Lambda
  BotHandlerFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub '${AWS::StackName}-bot-handler'
      CodeUri: ./dist/
      Handler: handlers/bot.handler
      MemorySize: 512
      Environment:
        Variables:
          TELEGRAM_BOT_TOKEN: !Ref TelegramBotToken
      Events:
        WebhookApi:
          Type: Api
          Properties:
            Path: /webhook/{token}
            Method: POST
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref BookomolBucket
        - Statement:
          - Effect: Allow
            Action:
              - rds:DescribeDBInstances
              - sqs:SendMessage
            Resource: '*'

  # Chapter Splitter Lambda
  ChapterSplitterFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub '${AWS::StackName}-chapter-splitter'
      CodeUri: ./dist/
      Handler: handlers/splitter.handler
      MemorySize: 3008
      Timeout: 900
      Environment:
        Variables:
          GEMINI_API_KEY: !Ref GeminiApiKey
      Events:
        S3Event:
          Type: S3
          Properties:
            Bucket: !Ref BookomolBucket
            Events: s3:ObjectCreated:*
            Filter:
              S3Key:
                Rules:
                  - Name: prefix
                    Value: original/
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref BookomolBucket
        - Statement:
          - Effect: Allow
            Action:
              - rds:DescribeDBInstances
              - sqs:SendMessage
            Resource: '*'

  # Chapter Processor Lambda
  ChapterProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub '${AWS::StackName}-chapter-processor'
      CodeUri: ./dist/
      Handler: handlers/processor.handler
      MemorySize: 1024
      Timeout: 900
      ReservedConcurrentExecutions: 10
      Environment:
        Variables:
          GEMINI_API_KEY: !Ref GeminiApiKey
      Events:
        S3Event:
          Type: S3
          Properties:
            Bucket: !Ref BookomolBucket
            Events: s3:ObjectCreated:*
            Filter:
              S3Key:
                Rules:
                  - Name: prefix
                    Value: chapters/
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref BookomolBucket
        - Statement:
          - Effect: Allow
            Action:
              - rds:DescribeDBInstances
              - sqs:SendMessage
            Resource: '*'

  # Book Assembler Lambda
  BookAssemblerFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub '${AWS::StackName}-book-assembler'
      CodeUri: ./dist/
      Handler: handlers/assembler.handler
      MemorySize: 2048
      Timeout: 600
      Environment:
        Variables:
          TELEGRAM_BOT_TOKEN: !Ref TelegramBotToken
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref BookomolBucket
        - Statement:
          - Effect: Allow
            Action:
              - rds:DescribeDBInstances
              - sqs:SendMessage
            Resource: '*'

  # SQS Queue for status updates
  ProcessingQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub '${AWS::StackName}-processing-status'
      VisibilityTimeout: 300
      MessageRetentionPeriod: 86400

  # RDS PostgreSQL Database
  BookomolDB:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '${AWS::StackName}-db'
      DBName: bookomol
      Engine: postgres
      EngineVersion: '15'
      DBInstanceClass: db.t3.micro
      AllocatedStorage: 20
      MasterUsername: dbadmin
      MasterUserPassword: !Ref DatabasePassword
      VPCSecurityGroups:
        - !Ref DBSecurityGroup
      BackupRetentionPeriod: 7
      PreferredBackupWindow: '03:00-04:00'
      PreferredMaintenanceWindow: 'sun:04:00-sun:05:00'

  # Security Group for RDS
  DBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Bookomol RDS
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref LambdaSecurityGroup

  # Security Group for Lambda functions
  LambdaSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Lambda functions

Outputs:
  ApiEndpoint:
    Description: API Gateway endpoint URL
    Value: !Sub 'https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}'
  BucketName:
    Description: S3 bucket name
    Value: !Ref BookomolBucket
  DatabaseEndpoint:
    Description: RDS endpoint
    Value: !GetAtt BookomolDB.Endpoint.Address
```

##### 8.2.2 Deployment Commands

```bash
# Install SAM CLI
pip install aws-sam-cli

# Build the application
sam build

# Deploy to AWS (first time - interactive)
sam deploy --guided

# Subsequent deployments
sam deploy

# Deploy to specific environment
sam deploy --parameter-overrides Environment=prod
```

##### 8.2.3 Environment Configuration

```yaml
# samconfig.toml - SAM configuration file
version = 0.1
[default]
[default.deploy]
[default.deploy.parameters]
stack_name = "bookomol"
s3_bucket = "aws-sam-cli-managed-default-samclisourcebucket-xxxxx"
s3_prefix = "bookomol"
region = "us-east-1"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Environment=dev TelegramBotToken=<token> GeminiApiKey=<key> DatabasePassword=<password>"

[prod]
[prod.deploy]
[prod.deploy.parameters]
stack_name = "bookomol-prod"
parameter_overrides = "Environment=prod TelegramBotToken=<prod-token> GeminiApiKey=<prod-key> DatabasePassword=<prod-password>"
```

##### 8.2.4 Local Development

```yaml
# local-env.json - Local testing configuration
{
  "BotHandlerFunction": {
    "TELEGRAM_BOT_TOKEN": "test-token",
    "S3_BUCKET": "local-bucket",
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "NODE_ENV": "development"
  }
}
```

```bash
# Start local API
sam local start-api --env-vars local-env.json

# Invoke specific function
sam local invoke BotHandlerFunction --event events/test-webhook.json
```

##### 8.2.5 Key Benefits of SAM

1. **Simplicity**: Single YAML file defines entire infrastructure
2. **AWS Native**: Built specifically for AWS serverless applications
3. **Local Testing**: Built-in local development capabilities
4. **Auto-packaging**: Automatically packages and uploads Lambda code
5. **CloudFormation Integration**: Leverages AWS CloudFormation under the hood
6. **Cost Optimization**: Only pay for resources used, no upfront costs

##### 8.2.6 Migration from Pulumi

For teams currently using Pulumi, migration to SAM involves:

1. Export existing resources as CloudFormation template
2. Convert resource definitions to SAM syntax
3. Test deployment in development environment
4. Update CI/CD pipelines to use SAM CLI
5. Gradually migrate environments

The SAM approach significantly reduces complexity while maintaining all required functionality for the Bookomol serverless application.

### 9. Quality Assurance

#### 9.1 Code Quality Standards

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier configuration
- **Type Safety**: Strict TypeScript mode

#### 9.2 Testing Approach

Do not write automatic tests on this stage

### 10. Monitoring & Observability

#### 10.1 CloudWatch Metrics

```typescript
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
npm run db:migrate  # Run database migrations
npm run db:seed     # Seed development data
npm run deploy:dev  # Deploy to dev environment
