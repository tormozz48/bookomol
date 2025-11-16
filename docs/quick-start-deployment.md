# Quick Start Deployment Guide

## Objective

Get a working Telegram bot deployed to AWS within the first day, even with stub functionality.

## Prerequisites

- AWS Account with CLI configured
- Telegram Bot Token (from @BotFather)
- Node.js 20.x installed
- AWS SAM CLI installed

## Step-by-Step Deployment (Day 1)

### 1. Clone and Initialize (15 minutes)

```bash
# Initialize npm project
npm init -y

# Install minimal dependencies
npm install grammy aws-sdk
npm install -D typescript @types/node @types/aws-lambda

# Install linting tools
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier eslint-plugin-prettier

# Initialize TypeScript
npx tsc --init

# Initialize ESLint
npx eslint --init
# Choose: To check syntax, find problems, and enforce code style
# Choose: JavaScript modules (import/export)
# Choose: None of these
# Choose: Yes (TypeScript)
# Choose: Node
# Choose: Use a popular style guide
# Choose: JSON
```

### 1.5. Configure Linting (5 minutes)

```json
// .eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "env": {
    "node": true,
    "es2022": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  }
}
```

```json
// .prettierrc.json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

Add to package.json scripts:

```json
"scripts": {
  "build": "tsc",
  "lint": "eslint 'src/**/*.ts'",
  "format": "prettier --write 'src/**/*.ts'"
}

### 2. Create Minimal Bot Handler (15 minutes)

```typescript
// src/handlers/bot.ts
import { Bot, webhookCallback } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.command('start', async (ctx) => {
  await ctx.reply('🚧 Bookomol Bot is under construction!\n\nComing soon: PDF book condensing powered by AI.');
});

bot.command('help', async (ctx) => {
  await ctx.reply('Available commands:\n/start - Welcome message\n/condense - Coming soon!');
});

bot.on('message', async (ctx) => {
  await ctx.reply("I don't understand that command yet. Try /help");
});

export const handler = webhookCallback(bot, 'aws-lambda');
```

### 3. Create Minimal SAM Template (10 minutes)

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Bookomol Bot - Quick Start

Parameters:
  TelegramBotToken:
    Type: String
    NoEcho: true

Resources:
  BotHandlerFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: dist/handlers/bot.handler
      Runtime: nodejs20.x
      MemorySize: 256
      Timeout: 30
      Environment:
        Variables:
          TELEGRAM_BOT_TOKEN: !Ref TelegramBotToken
      Events:
        WebhookApi:
          Type: Api
          Properties:
            Path: /webhook
            Method: POST

Outputs:
  WebhookUrl:
    Description: Webhook URL for Telegram
    Value: !Sub 'https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/webhook'
```

### 4. Build and Deploy (20 minutes)

```bash
# Build TypeScript
npx tsc

# Build SAM application
sam build

# Deploy (first time - interactive)
sam deploy --guided

# Follow prompts:
# - Stack Name: bookomol-dev
# - AWS Region: us-east-1
# - Parameter TelegramBotToken: YOUR_BOT_TOKEN
# - Confirm changes: y
```

### 5. Set Telegram Webhook (5 minutes)

```bash
# Get the webhook URL from CloudFormation outputs
aws cloudformation describe-stacks \
  --stack-name bookomol-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`WebhookUrl`].OutputValue' \
  --output text

# Set webhook (replace YOUR_BOT_TOKEN and WEBHOOK_URL)
curl https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook \
  -F "url=WEBHOOK_URL"
```

### 6. Test Your Bot

- Open Telegram
- Search for your bot username
- Send `/start` command
- You should see the construction message!

## Next Steps

### Day 2-3: Add More Stubs

```typescript
// Add to bot.ts
bot.command('condense', async (ctx) => {
  await ctx.reply('📚 Book condensing feature coming soon!\n\nThis will allow you to upload PDF books and get AI-powered summaries.');
});

bot.on('message:document', async (ctx) => {
  await ctx.reply('📄 I see you uploaded a file! PDF processing will be available soon.');
});
```

### Day 4-7: Add S3 Bucket

```yaml
# Add to template.yaml Resources
BookomolBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: !Sub 'bookomol-${AWS::AccountId}-${AWS::Region}'
```

### Week 2: Add Database

```yaml
# Add minimal RDS instance
BookomolDB:
  Type: AWS::RDS::DBInstance
  Properties:
    Engine: postgres
    DBInstanceClass: db.t3.micro
    AllocatedStorage: 20
```

## Progressive Enhancement Strategy

### Stage 1: Stub Bot (Day 1) ✅

- Basic commands responding
- Webhook configured
- Deployed to AWS

### Stage 2: File Handling (Week 1)

- Accept PDF uploads
- Store in S3
- Return "processing queued" message

### Stage 3: User Management (Week 2)

- Track users in database
- Implement quotas
- Show usage stats

### Stage 4: Processing Pipeline (Week 3-4)

- Lambda functions created (stubs)
- S3 triggers configured
- Status updates sent

### Stage 5: AI Integration (Week 5-6)

- Gemini API connected
- Actual processing implemented
- Results delivered

## Deployment Commands Reference

```bash
# Deploy updates
npm run build && sam deploy

# View logs
sam logs -n BotHandlerFunction --stack-name bookomol-dev --tail

# Delete stack (if needed)
sam delete --stack-name bookomol-dev

# Local testing (optional)
sam local start-api --env-vars env.json
```

## Environment Variables Template

```json
// env.json for local testing
{
  "BotHandlerFunction": {
    "TELEGRAM_BOT_TOKEN": "your-bot-token-here"
  }
}
```

## Common Issues & Solutions

1. **Webhook not responding**
   - Check CloudWatch logs
   - Verify bot token is correct
   - Ensure API Gateway is deployed

2. **TypeScript build errors**
   - Run `npm install` again
   - Check tsconfig.json paths
   - Ensure all imports are correct

3. **SAM deployment fails**
   - Check AWS credentials
   - Verify region settings
   - Review CloudFormation events

## Cost Estimate (Stub Version)

- Lambda: ~$0 (free tier)
- API Gateway: ~$0 (free tier)  
- Total: < $1/month

This allows you to have a working bot deployed immediately while you build out the full functionality!
