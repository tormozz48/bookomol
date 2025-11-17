# Bookomol

A Telegram bot service that condenses technical PDF books using AI, making them easier and faster to read while retaining essential information.

## Features

- 📚 **PDF Book Condensing** - Upload any technical PDF book and get a condensed version
- 🎯 **Three Condensing Levels**:
  - **Light** (30% reduction) - Keeps examples and detailed explanations
  - **Medium** (50% reduction) - Removes most examples, keeps core explanations
  - **Heavy** (70% reduction) - Extracts only core concepts and key points
- 🤖 **AI-Powered** - Uses Google Gemini API to intelligently condense content
- ⚡ **Real-time Progress** - Live progress updates during processing
- 🔗 **Direct Downloads** - Get download links right in Telegram

## Tech Stack

- **Backend**: Node.js with TypeScript
- **Infrastructure**: SST (Serverless Stack) on AWS
- **Bot Framework**: grammY
- **AI**: Google Gemini API
- **Services**: AWS Lambda, S3, DynamoDB, SQS

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure AWS credentials
4. Set up environment variables
5. Deploy with SST: `npm run deploy`

## Documentation

- [Architecture Design](docs/architecture.md) - Detailed system design and technical documentation

## License

MIT
