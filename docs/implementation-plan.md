# Bookomol Implementation Plan

## Phase 1: Project Setup and Infrastructure

### 1.1 Initialize Node.js Project
```bash
npm init -y
npm install typescript @types/node tsx
npm install -D @types/aws-lambda @types/aws-sdk
```

### 1.2 TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.3 ESLint and Prettier Setup
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
```

### 1.4 SST Framework Setup
```bash
npm install sst@latest
npx sst init
```

## Phase 2: AWS Infrastructure

### 2.1 SST Stack Configuration
```typescript
// sst.config.ts
import { SSTConfig } from "sst";
import { BookomolStack } from "./stacks/BookomolStack";

export default {
  config(_input) {
    return {
      name: "bookomol",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(BookomolStack);
  }
} satisfies SSTConfig;
```

### 2.2 Main Stack Definition
```typescript
// stacks/BookomolStack.ts
import { StackContext, Api, Bucket, Table, Queue, Function } from "sst/constructs";

export function BookomolStack({ stack }: StackContext) {
  // DynamoDB Tables
  const booksTable = new Table(stack, "Books", {
    fields: {
      bookId: "string",
      userId: "string",
    },
    primaryIndex: { partitionKey: "bookId" },
    globalIndexes: {
      userIndex: { partitionKey: "userId" },
    },
  });

  const sessionsTable = new Table(stack, "Sessions", {
    fields: {
      sessionId: "string",
      userId: "string",
    },
    primaryIndex: { partitionKey: "sessionId" },
    timeToLiveAttribute: "expiresAt",
  });

  // S3 Buckets
  const pdfBucket = new Bucket(stack, "PdfStorage", {
    cors: true,
    notifications: {
      processPdf: {
        function: {
          handler: "src/functions/pdf-processor.handler",
        },
        events: ["object_created"],
        filters: [{ prefix: "original/" }],
      },
    },
  });

  // SQS Queues
  const processingQueue = new Queue(stack, "ProcessingQueue", {
    consumer: {
      function: {
        handler: "src/functions/queue-processor.handler",
        timeout: 900, // 15 minutes
        memorySize: 3008,
      },
    },
  });

  const progressQueue = new Queue(stack, "ProgressQueue", {
    consumer: {
      function: {
        handler: "src/functions/progress-handler.handler",
        timeout: 60,
      },
    },
  });

  // API Gateway for Telegram Webhook
  const api = new Api(stack, "TelegramApi", {
    routes: {
      "POST /webhook": {
        function: {
          handler: "src/functions/bot-handler.handler",
          environment: {
            TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
            BOOKS_TABLE: booksTable.tableName,
            SESSIONS_TABLE: sessionsTable.tableName,
            PDF_BUCKET: pdfBucket.bucketName,
            PROCESSING_QUEUE: processingQueue.queueUrl,
            PROGRESS_QUEUE: progressQueue.queueUrl,
          },
        },
      },
    },
  });

  // Grant permissions
  api.attachPermissions([booksTable, sessionsTable, pdfBucket, processingQueue, progressQueue]);
  
  // Output webhook URL
  stack.addOutputs({
    WebhookUrl: api.url + "/webhook",
  });
}
```

## Phase 3: Core Services Implementation

### 3.1 Telegram Bot Service
```typescript
// src/lib/telegram/bot.ts
import { Bot, Context, SessionFlavor, session } from "grammy";
import { FileApiFlavor, hydrateFiles } from "@grammyjs/files";

interface SessionData {
  condensingLevel?: "light" | "medium" | "heavy";
  awaitingFile?: boolean;
  bookId?: string;
}

export type BotContext = Context & SessionFlavor<SessionData> & FileApiFlavor<Context>;

export const createBot = (token: string) => {
  const bot = new Bot<BotContext>(token);
  
  bot.api.config.use(hydrateFiles(bot.token));
  
  bot.use(session({
    initial: (): SessionData => ({}),
  }));
  
  return bot;
};
```

### 3.2 PDF Processing Service
```typescript
// src/lib/pdf/processor.ts
import { PDFDocument } from "pdf-lib";
import * as pdfParse from "pdf-parse";

export interface ChapterInfo {
  title: string;
  startPage: number;
  endPage: number;
  content?: string;
}

export class PdfProcessor {
  async extractText(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
  }
  
  async splitChapters(buffer: Buffer): Promise<ChapterInfo[]> {
    // This will be replaced with AI-based chapter detection
    // For now, return mock chapters
    return [
      { title: "Chapter 1", startPage: 1, endPage: 50 },
      { title: "Chapter 2", startPage: 51, endPage: 100 },
    ];
  }
  
  async extractChapter(buffer: Buffer, chapter: ChapterInfo): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(buffer);
    const newPdf = await PDFDocument.create();
    
    const pages = await newPdf.copyPages(
      pdfDoc,
      Array.from(
        { length: chapter.endPage - chapter.startPage + 1 },
        (_, i) => chapter.startPage - 1 + i
      )
    );
    
    pages.forEach(page => newPdf.addPage(page));
    
    return Buffer.from(await newPdf.save());
  }
}
```

### 3.3 AI Integration Service
```typescript
// src/lib/ai/gemini-client.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CondensingOptions {
  level: "light" | "medium" | "heavy";
  preserveCodeExamples?: boolean;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  
  async identifyChapters(text: string): Promise<ChapterInfo[]> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
      Analyze this book text and identify all chapters.
      Identify which chapters are essential (main content) and which are non-essential (preface, acknowledgments, index, etc.).
      Return a JSON array with: title, isEssential, approximateStartPage.
      
      Text: ${text.substring(0, 5000)}...
    `;
    
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  }
  
  async condenseChapter(text: string, options: CondensingOptions): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompts = {
      light: "Condense this chapter by 30%, keeping all examples and detailed explanations.",
      medium: "Condense this chapter by 50%, removing most examples but keeping core explanations.",
      heavy: "Condense this chapter by 70%, extracting only core concepts and key points.",
    };
    
    const prompt = `
      ${prompts[options.level]}
      Maintain technical accuracy and logical flow.
      Format the output in a clear, readable manner.
      
      Chapter content:
      ${text}
    `;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
```

## Phase 4: Lambda Functions

### 4.1 Bot Handler Lambda
```typescript
// src/functions/bot-handler.ts
import { APIGatewayProxyHandler } from "aws-lambda";
import { createBot } from "../lib/telegram/bot";
import { SessionService } from "../lib/services/session-service";
import { BookService } from "../lib/services/book-service";

export const handler: APIGatewayProxyHandler = async (event) => {
  const bot = createBot(process.env.TELEGRAM_BOT_TOKEN!);
  const sessionService = new SessionService();
  const bookService = new BookService();
  
  // Command handlers
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Welcome to Bookomol! 📚\n\n" +
      "I can help you condense technical PDF books using AI.\n\n" +
      "Use /condense to start processing a book.\n" +
      "Use /help for more information."
    );
  });
  
  bot.command("condense", async (ctx) => {
    const session = await sessionService.createSession(ctx.from!.id, ctx.chat.id);
    
    await ctx.reply(
      "Let's condense your book! 📖\n\n" +
      "First, select the condensing level:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🟢 Light (30%)", callback_data: "level:light" },
              { text: "🟡 Medium (50%)", callback_data: "level:medium" },
              { text: "🔴 Heavy (70%)", callback_data: "level:heavy" },
            ],
            [{ text: "❌ Cancel", callback_data: "cancel" }],
          ],
        },
      }
    );
  });
  
  // Callback handlers
  bot.callbackQuery(/^level:(.+)$/, async (ctx) => {
    const level = ctx.match![1] as "light" | "medium" | "heavy";
    await sessionService.updateSession(ctx.from.id, { condensingLevel: level });
    
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `Great! You selected ${level} condensing.\n\n` +
      "Now please upload your PDF book (max 100MB):"
    );
  });
  
  // File handler
  bot.on("message:document", async (ctx) => {
    if (ctx.message.document.mime_type !== "application/pdf") {
      await ctx.reply("Please upload a PDF file.");
      return;
    }
    
    const session = await sessionService.getSession(ctx.from.id);
    if (!session || !session.condensingLevel) {
      await ctx.reply("Please use /condense to start.");
      return;
    }
    
    const progressMessage = await ctx.reply("📤 Uploading PDF...");
    
    try {
      const file = await ctx.getFile();
      const book = await bookService.createBook({
        userId: ctx.from.id.toString(),
        chatId: ctx.chat.id.toString(),
        messageId: progressMessage.message_id.toString(),
        condensingLevel: session.condensingLevel,
        fileName: ctx.message.document.file_name || "book.pdf",
        fileSize: ctx.message.document.file_size || 0,
      });
      
      // Upload to S3 and queue processing
      await bookService.uploadAndQueue(book.bookId, file);
      
      await ctx.api.editMessageText(
        ctx.chat.id,
        progressMessage.message_id,
        "✅ Upload complete! Processing started...\n\n" +
        "📊 Progress: 0% - Initializing..."
      );
    } catch (error) {
      await ctx.reply("❌ Failed to process your book. Please try again.");
    }
  });
  
  // Process webhook
  await bot.handleUpdate(JSON.parse(event.body!));
  
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};
```

### 4.2 Queue Processor Lambda
```typescript
// src/functions/queue-processor.ts
import { SQSHandler } from "aws-lambda";
import { BookService } from "../lib/services/book-service";
import { PdfProcessor } from "../lib/pdf/processor";
import { GeminiClient } from "../lib/ai/gemini-client";
import { ProgressService } from "../lib/services/progress-service";

export const handler: SQSHandler = async (event) => {
  const bookService = new BookService();
  const pdfProcessor = new PdfProcessor();
  const geminiClient = new GeminiClient(process.env.GEMINI_API_KEY!);
  const progressService = new ProgressService();
  
  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    const { bookId, action } = message;
    
    try {
      switch (action) {
        case "process_book":
          await processBook(bookId);
          break;
        case "condense_chapter":
          await condenseChapter(bookId, message.chapterId);
          break;
        case "combine_chapters":
          await combineChapters(bookId);
          break;
      }
    } catch (error) {
      console.error(`Failed to process ${action} for book ${bookId}:`, error);
      await bookService.markFailed(bookId, error.message);
    }
  }
  
  async function processBook(bookId: string) {
    await progressService.updateProgress(bookId, 10, "Analyzing book structure...");
    
    const book = await bookService.getBook(bookId);
    const pdfBuffer = await bookService.downloadOriginal(bookId);
    
    // Extract text and identify chapters
    const text = await pdfProcessor.extractText(pdfBuffer);
    const chapters = await geminiClient.identifyChapters(text);
    
    await progressService.updateProgress(bookId, 25, "Extracting chapters...");
    
    // Save chapter information
    await bookService.updateChapters(bookId, chapters);
    
    // Queue chapter condensing jobs
    const essentialChapters = chapters.filter(ch => ch.isEssential);
    for (const chapter of essentialChapters) {
      await progressService.queueChapterProcessing(bookId, chapter.chapterId);
    }
    
    await progressService.updateProgress(bookId, 30, `Processing ${essentialChapters.length} chapters...`);
  }
};
```

## Phase 5: Deployment

### 5.1 Environment Configuration
```bash
# .env.local
TELEGRAM_BOT_TOKEN=your_bot_token
GEMINI_API_KEY=your_gemini_api_key

# .env.production
TELEGRAM_BOT_TOKEN=production_bot_token
GEMINI_API_KEY=production_gemini_api_key
```

### 5.2 Deployment Scripts
```json
// package.json
{
  "scripts": {
    "dev": "sst dev",
    "build": "sst build",
    "deploy": "sst deploy",
    "deploy:prod": "sst deploy --stage production",
    "remove": "sst remove",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

### 5.3 CI/CD with GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run deploy:prod
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Phase 6: Monitoring and Operations

### 6.1 CloudWatch Alarms
- Lambda errors > 1% trigger alert
- Processing time > 10 minutes trigger alert
- Failed jobs in DLQ trigger immediate alert

### 6.2 Logging Standards
```typescript
logger.info("Processing book", {
  bookId,
  userId,
  action: "start",
  condensingLevel,
});

logger.error("Processing failed", {
  bookId,
  error: error.message,
  stack: error.stack,
});
```

## Timeline

- **Week 1**: Project setup, infrastructure configuration
- **Week 2**: Core services implementation
- **Week 3**: Lambda functions and integrations
- **Week 4**: Deployment setup and final integration
- **Week 5**: Production deployment and monitoring

## Success Criteria

1. Bot responds to commands within 2 seconds
2. PDF processing completes within 10 minutes for 500-page book
3. Condensed books maintain readability and accuracy
4. System handles 100 concurrent book processing requests
5. 99.9% uptime for bot availability