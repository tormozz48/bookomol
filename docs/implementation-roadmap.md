# Bookomol Implementation Roadmap

## Overview

This roadmap implements the Bookomol PDF book condensing Telegram bot with an emphasis on early deployment and iterative development. Each phase builds upon the previous one, allowing for continuous deployment and testing.

## Timeline Overview

- **Total Duration**: 8-9 weeks
- **Early Deployment**: End of Week 1
- **MVP with Basic Features**: End of Week 3
- **Full Feature Set**: End of Week 7
- **Production Ready**: End of Week 9

## Phase 1: Project Setup & Basic Infrastructure (Days 1-3)

### Objectives

- Initialize project structure
- Set up development environment
- Configure basic AWS infrastructure
- Deploy empty Lambda functions as stubs

### Tasks

#### 1.1 Project Initialization

```bash
# Create project structure
mkdir -p src/{handlers,services,models,utils,config}
mkdir -p src/database/{models,migrations,config}
mkdir -p infrastructure/sam
mkdir -p docs/api
mkdir -p scripts
```

#### 1.2 Initialize Node.js Project

```json
{
  "name": "bookomol",
  "version": "0.1.0",
  "description": "PDF Book Condensing Telegram Bot",
  "main": "dist/index.js",
  "scripts": {
  "build": "tsc",
  "dev": "nodemon",
  "deploy:dev": "npm run build && sam deploy --config-env default",
  "deploy:prod": "npm run build && sam deploy --config-env prod --confirm-changeset"
}
}
```

#### 1.3 Install Core Dependencies

```bash
# Production dependencies
npm install aws-sdk @aws-sdk/client-s3 @aws-sdk/client-sqs @aws-sdk/client-lambda
npm install grammy @grammyjs/types
npm install pino pino-pretty
npm install dotenv

# Development dependencies
npm install -D typescript @types/node @types/aws-lambda
npm install -D nodemon ts-node
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
```

#### 1.4 Configure ESLint and Prettier

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

```json
// .prettierrc.json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

```
// .eslintignore
node_modules/
dist/
*.js
!.eslintrc.js
```

```
// .prettierignore
node_modules/
dist/
*.md
```

Add linting scripts to package.json:

```json
{
  "scripts": {
    "lint": "eslint 'src/**/*.ts'",
    "lint:fix": "eslint 'src/**/*.ts' --fix",
    "format": "prettier --write 'src/**/*.ts'",
    "format:check": "prettier --check 'src/**/*.ts'"
  }
}
```

#### 1.5 Create Basic SAM Template with Stubs

```yaml
# template.yaml
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

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, prod]

Resources:
  # Stub Lambda Functions
  BotHandlerFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub '${AWS::StackName}-bot-handler'
      CodeUri: ./dist/
      Handler: handlers/bot.handler
      MemorySize: 512
      Events:
        WebhookApi:
          Type: Api
          Properties:
            Path: /webhook/{token}
            Method: POST

Outputs:
  ApiEndpoint:
    Description: API Gateway endpoint URL
    Value: !Sub 'https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod'
```

#### 1.6 Create Stub Handlers

```typescript
// src/handlers/bot.ts
export const handler = async (event: any) => {
  console.log('Bot webhook received:', JSON.stringify(event, null, 2));
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true })
  };
};
```

### Deliverables

- ✅ Basic project structure
- ✅ TypeScript configuration
- ✅ SAM template with stub Lambda
- ✅ Deployed API endpoint (non-functional)

---

## Phase 2: Minimal Viable Bot with Stubs (Days 4-7)

### Objectives

- Implement basic Telegram bot functionality
- Create stub responses for all commands
- Set up local development environment
- Deploy working bot with limited functionality

### Tasks

#### 2.1 Set Up Grammy Bot Framework

```typescript
// src/services/telegram/bot.ts
import { Bot } from 'grammy';

export const createBot = (token: string) => {
  const bot = new Bot(token);
  
  // Basic commands with stubs
  bot.command('start', async (ctx) => {
    await ctx.reply('Welcome to Bookomol! 📚\n\nThis bot is under construction.');
  });
  
  bot.command('condense', async (ctx) => {
    await ctx.reply('📝 Book condensing feature coming soon!');
  });
  
  bot.command('help', async (ctx) => {
    await ctx.reply('Available commands:\n/start - Welcome message\n/condense - Condense a book (coming soon)\n/help - Show this help');
  });
  
  return bot;
};
```

#### 2.2 Implement Webhook Handler

```typescript
// src/handlers/bot.ts
import { webhookCallback } from 'grammy';
import { createBot } from '../services/telegram/bot';

const bot = createBot(process.env.TELEGRAM_BOT_TOKEN!);

export const handler = webhookCallback(bot, 'aws-lambda');
```

#### 2.3 Docker Compose for Local Development

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: bookomol_dev
      POSTGRES_USER: bookomol
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

### Deliverables

- ✅ Working Telegram bot responding to commands
- ✅ Local development environment
- ✅ Bot deployed and accessible via Telegram
- ✅ All commands return stub responses

---

## Phase 3: Database & User Management (Week 2)

### Objectives

- Set up Sequelize with TypeScript decorators
- Implement user registration and tracking
- Add quota management
- Deploy RDS instance

### Tasks

#### 3.1 Install Database Dependencies

```bash
npm install sequelize sequelize-typescript pg pg-hstore reflect-metadata
npm install -D @types/validator sequelize-cli
```

#### 3.2 Implement Database Models

```typescript
// src/database/models/User.ts
import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({
  tableName: 'users',
  timestamps: true,
})
export class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.BIGINT)
  telegramId!: number;

  @Column(DataType.STRING(255))
  username?: string;

  // ... other fields
}
```

#### 3.3 Add RDS to SAM Template

```yaml
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
```

#### 3.4 Implement User Registration in Bot

```typescript
bot.command('start', async (ctx) => {
  const user = await userService.findOrCreate({
    telegramId: ctx.from.id,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
  });
  
  await ctx.reply(`Welcome to Bookomol, ${user.firstName}! 📚`);
});
```

### Deliverables

- ✅ Database models implemented
- ✅ RDS instance deployed
- ✅ User registration working
- ✅ Database migrations set up

---

## Phase 4: S3 Integration & File Handling (Week 3)

### Objectives

- Set up S3 bucket with lifecycle policies
- Implement file upload handling
- Create presigned URLs for downloads
- Add basic file validation

### Tasks

#### 4.1 Add S3 Bucket to SAM

```yaml
BookomolBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: !Sub 'bookomol-storage-${Environment}'
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256
    LifecycleConfiguration:
      Rules:
        - Id: DeleteOriginalBooks
          Status: Enabled
          ExpirationInDays: 1
          Prefix: original/
```

#### 4.2 Implement File Upload Service

```typescript
// src/services/storage/s3Service.ts
export class S3Service {
  async generateUploadUrl(userId: string, fileName: string): Promise<string> {
    // Generate presigned URL for upload
  }
  
  async generateDownloadUrl(key: string): Promise<string> {
    // Generate presigned URL for download
  }
}
```

#### 4.3 Update Bot to Handle File Uploads

```typescript
bot.on('message:document', async (ctx) => {
  if (ctx.message.document.mime_type !== 'application/pdf') {
    return ctx.reply('❌ Please upload a PDF file.');
  }
  
  // Create job and store file info
  const job = await jobService.createJob(ctx.from.id, ctx.message.document);
  
  await ctx.reply('📚 Book received! Select condensation level:', {
    reply_markup: condensationLevelKeyboard
  });
});
```

### Deliverables

- ✅ S3 bucket configured and deployed
- ✅ File upload workflow implemented
- ✅ Basic file validation
- ✅ Jobs tracked in database

---

## Phase 5: Chapter Processing Pipeline (Weeks 4-5)

### Objectives

- Implement Lambda functions for processing pipeline
- Set up S3 event triggers
- Add SQS for status updates
- Create progress tracking

### Tasks

#### 5.1 Implement Chapter Splitter Lambda

```typescript
// src/handlers/splitter.ts
export const handler = async (event: S3Event) => {
  // For now, stub implementation
  // Later: Integrate with Gemini API
  console.log('Chapter splitting triggered for:', event.Records[0].s3.object.key);
  
  // Simulate chapter splitting
  await simulateChapterSplitting(event.Records[0].s3);
};
```

#### 5.2 Add Processing Lambdas to SAM

```yaml
ChapterSplitterFunction:
  Type: AWS::Serverless::Function
  Properties:
    FunctionName: !Sub '${AWS::StackName}-chapter-splitter'
    Handler: handlers/splitter.handler
    MemorySize: 3008
    Timeout: 900
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
```

#### 5.3 Set Up SQS for Progress Updates

```yaml
ProcessingQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: !Sub '${AWS::StackName}-processing-status'
    VisibilityTimeout: 300
```

#### 5.4 Implement Status Notifier

```typescript
// src/handlers/notifier.ts
export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const status = JSON.parse(record.body);
    await notifyUser(status);
  }
};
```

### Deliverables

- ✅ All Lambda functions deployed (with stubs)
- ✅ S3 triggers configured
- ✅ SQS queue operational
- ✅ Basic progress tracking working

---

## Phase 6: AI Integration & Content Processing (Weeks 6-7)

### Objectives

- Integrate Google Gemini API
- Implement actual chapter analysis
- Add content condensation logic
- Complete PDF processing pipeline

### Tasks

#### 6.1 Set Up Gemini API Client

```typescript
// src/services/ai/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  
  async analyzeChapters(pdfContent: string): Promise<ChapterAnalysis> {
    // Implement chapter detection
  }
  
  async condenseChapter(content: string, level: CondensationLevel): Promise<string> {
    // Implement content condensation
  }
}
```

#### 6.2 Implement PDF Processing Libraries

```bash
npm install pdf-lib pdfjs-dist
npm install @google/generative-ai
```

#### 6.3 Complete Chapter Processing Logic

```typescript
// Update splitter.ts with actual implementation
export const handler = async (event: S3Event) => {
  const pdfContent = await s3Service.getObject(event.Records[0].s3);
  const chapters = await geminiService.analyzeChapters(pdfContent);
  
  for (const chapter of chapters) {
    await s3Service.putObject(`chapters/${chapter.id}`, chapter.content);
  }
  
  await sqsService.sendMessage({
    jobId,
    status: 'chapters_ready',
    totalChapters: chapters.length
  });
};
```

### Deliverables

- ✅ Gemini API integrated
- ✅ Chapter detection working
- ✅ Content condensation functional
- ✅ End-to-end processing pipeline

---

## Phase 7: Production Readiness (Week 8)

### Objectives

- Add comprehensive error handling
- Implement retry logic
- Set up monitoring and alerts
- Performance optimization

### Tasks

#### 7.1 Error Handling & Retries

```typescript
// src/utils/errorHandler.ts
export const withRetry = async (fn: Function, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(Math.pow(2, i) * 1000);
    }
  }
};
```

#### 7.2 CloudWatch Metrics & Alarms

```yaml
BookProcessingAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${AWS::StackName}-processing-failures'
    MetricName: BookProcessingFailed
    Namespace: Bookomol
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 5
```

#### 7.3 Add Dead Letter Queues

```yaml
ProcessingQueueDLQ:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: !Sub '${AWS::StackName}-processing-dlq'
```

### Deliverables

- ✅ Comprehensive error handling
- ✅ Retry mechanisms in place
- ✅ Monitoring configured
- ✅ Performance optimized

---

## Phase 8: Monitoring & Optimization (Week 8-9)

### Objectives

- Set up comprehensive logging
- Implement cost optimization
- Add analytics and metrics
- Performance tuning

### Tasks

#### 8.1 Structured Logging

```typescript
// src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: ['password', 'apiKey', 'token'],
});
```

#### 8.2 Cost Optimization

- Implement S3 lifecycle policies
- Use Lambda ARM architecture
- Optimize memory allocations
- Cache frequently accessed data

#### 8.3 Performance Metrics

```typescript
// Track processing times
const startTime = Date.now();
// ... processing logic
await cloudWatch.putMetric('ProcessingDuration', Date.now() - startTime);
```

### Deliverables

- ✅ Comprehensive logging system
- ✅ Cost optimization implemented
- ✅ Performance metrics tracked
- ✅ System fully optimized

---

## Deployment Checkpoints

### Week 1 - Basic Bot Deployment

- ✅ Bot responds to commands
- ✅ API endpoint accessible
- ✅ Basic infrastructure in place

### Week 3 - MVP Deployment

- ✅ Users can upload PDFs
- ✅ Files stored in S3
- ✅ Basic job tracking

### Week 5 - Processing Pipeline

- ✅ PDFs processed (stub implementation)
- ✅ Progress updates sent
- ✅ Results delivered

### Week 7 - Full Feature Deployment

- ✅ AI integration complete
- ✅ All condensation levels working
- ✅ Production-ready features

### Week 9 - Production Deployment

- ✅ Monitoring in place
- ✅ Error handling robust
- ✅ Performance optimized
- ✅ Ready for users

---

## Risk Mitigation

### Technical Risks

1. **Gemini API Rate Limits**
   - Mitigation: Implement queuing and rate limiting
   - Fallback: Use multiple API keys or alternative models

2. **Large PDF Processing**
   - Mitigation: Streaming processing, chunking
   - Fallback: File size limits, premium tier

3. **Cold Start Latency**
   - Mitigation: Provisioned concurrency for bot handler
   - Fallback: User experience optimization

### Operational Risks

1. **Cost Overruns**
   - Mitigation: Set up billing alerts, implement quotas
   - Fallback: Rate limiting, user tiers

2. **Scaling Issues**
   - Mitigation: Auto-scaling policies, performance testing
   - Fallback: Queue throttling, gradual rollout

---

## Success Criteria

### Phase Completion Metrics

- **Phase 1**: Infrastructure deployed, accessible endpoint
- **Phase 2**: Bot live on Telegram, responds to commands
- **Phase 3**: Users stored in database, quota tracking
- **Phase 4**: PDFs upload and download successfully
- **Phase 5**: Processing pipeline executes end-to-end
- **Phase 6**: Books condensed with AI integration
- **Phase 7**: < 1% error rate, all edge cases handled
- **Phase 8**: < $200/month for 150 books, 99.5% uptime

### Overall Project Success

- ✅ Process 150 books/month within budget
- ✅ Average processing time < 15 minutes
- ✅ User satisfaction > 90%
- ✅ System availability > 99.5%
