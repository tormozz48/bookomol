# Development Setup Guide

This guide will help you set up the Bookomol project for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **AWS CLI** - [Installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **Git** - [Download here](https://git-scm.com/)

## AWS Setup

1. **Create an AWS Account** if you don't have one
2. **Configure AWS CLI** with your credentials:
   ```bash
   aws configure
   ```
   Enter your:
   - AWS Access Key ID
   - AWS Secret Access Key  
   - Default region (e.g., `us-east-1`)
   - Default output format (`json`)

3. **Verify AWS access**:
   ```bash
   aws sts get-caller-identity
   ```

## Telegram Bot Setup

1. **Create a Telegram Bot**:
   - Open Telegram and message [@BotFather](https://t.me/BotFather)
   - Send `/newbot` command
   - Follow the instructions to create your bot
   - Save the bot token for later

2. **Set webhook URL** (after deployment):
   ```bash
   curl -F "url=https://your-api-gateway-url/webhook" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```

## Google Gemini API Setup

1. **Get Gemini API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Sign in with your Google account
   - Create a new API key
   - Save the API key for later

## Project Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd bookomol
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** in `.env`:
   ```bash
   # Required for development
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Optional - for debugging
   LOG_LEVEL=debug
   NODE_ENV=development
   ```

5. **Install SST globally** (optional but recommended):
   ```bash
   npm install -g sst
   ```

## Development Commands

### Start Development Server
```bash
npm run dev
# or
sst dev
```

This will:
- Deploy the stack to AWS in development mode
- Start live Lambda development
- Set up hot reloading
- Create a development stage

### Build Project
```bash
npm run build
# or
sst build
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Code Formatting
```bash
npm run format
```

## Local Development Workflow

1. **Start SST development**:
   ```bash
   sst dev
   ```

2. **Note the outputs**, especially:
   - API Gateway webhook URL
   - DynamoDB table names
   - S3 bucket names

3. **Set Telegram webhook** (one-time setup):
   ```bash
   curl -F "url=https://your-dev-api-url/webhook" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```

4. **Test the bot**:
   - Open Telegram
   - Find your bot and start a conversation
   - Send `/start` to test basic functionality

## Testing the Workflow

### Manual Testing Steps

1. **Start conversation with bot**:
   ```
   /start
   ```

2. **Start condensing workflow**:
   ```
   /condense
   ```

3. **Select condensing level** using inline buttons

4. **Upload a PDF** (start with a small technical PDF for testing)

5. **Monitor progress** in the chat and AWS CloudWatch logs

### Monitoring Development

1. **CloudWatch Logs**:
   - Go to AWS Console > CloudWatch > Log Groups
   - Look for log groups starting with `/aws/lambda/your-stack-name`

2. **DynamoDB Tables**:
   - Go to AWS Console > DynamoDB > Tables
   - Monitor the Books and Sessions tables

3. **S3 Buckets**:
   - Go to AWS Console > S3
   - Check the PDF storage bucket for uploads

4. **SQS Queues**:
   - Go to AWS Console > SQS
   - Monitor message processing in queues

## File Structure

```
bookomol/
├── docs/                    # Documentation
├── src/
│   ├── functions/          # Lambda functions
│   │   ├── bot-handler.ts
│   │   ├── pdf-processor.ts
│   │   ├── queue-processor.ts
│   │   └── progress-handler.ts
│   ├── lib/
│   │   ├── ai/            # AI integration
│   │   ├── aws/           # AWS services
│   │   ├── pdf/           # PDF processing
│   │   ├── services/      # Business logic
│   │   └── telegram/      # Bot implementation
│   └── types/             # TypeScript types
├── stacks/                # SST infrastructure
└── [config files]
```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather | Yes | - |
| `GEMINI_API_KEY` | Google Gemini AI API key | Yes | - |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | No | info |
| `NODE_ENV` | Environment (development/production) | No | development |

## Troubleshooting

### Common Issues

1. **"Module not found" errors**:
   - Run `npm install` to install dependencies
   - Check your Node.js version (should be 18+)

2. **AWS permission errors**:
   - Verify AWS CLI configuration: `aws sts get-caller-identity`
   - Ensure your AWS user has sufficient permissions

3. **Telegram webhook errors**:
   - Verify your bot token
   - Check that the webhook URL is accessible
   - Use HTTPS URL (required by Telegram)

4. **Lambda timeout errors**:
   - Check CloudWatch logs for detailed errors
   - Large PDF files may need increased timeout

5. **Gemini API errors**:
   - Verify your API key is correct
   - Check API quotas and billing

### Getting Help

1. **Check logs**:
   ```bash
   sst logs    # View all Lambda logs
   ```

2. **Debug specific function**:
   ```bash
   sst logs --function BotHandler
   ```

3. **View stack resources**:
   ```bash
   sst list
   ```

## Next Steps

After setting up development:

1. Test with small PDF files first
2. Monitor AWS costs (especially Gemini API usage)
3. Configure proper IAM roles for production
4. Set up CI/CD pipeline
5. Add monitoring and alerting

For deployment to production, see [deployment-guide.md](./deployment-guide.md).