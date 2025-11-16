# Bookomol Project Documentation Index

This file serves as a comprehensive index to all documentation for the Bookomol PDF Book Condensing Telegram Bot project. Use this as context for Claude AI sessions.

## Project Overview

Bookomol is a serverless Telegram bot application that leverages AI (Google Gemini) to condense PDF books into more digestible formats. Built on AWS Lambda with TypeScript, it provides users with AI-powered book summarization at different condensation levels.

## Documentation Structure

### 📋 Requirements Documents

#### [Functional Requirements](docs/functional-requirements.md)

Complete functional specifications including:

- User commands and interactions
- Book upload and processing workflow
- Condensation levels (Brief 10-15%, Standard 25-30%, Comprehensive 40-50%)
- Business rules and quotas
- User interface specifications
- Error handling requirements

#### [Technical Requirements](docs/technical-requirements.md)

Detailed technical specifications covering:

- System requirements (Node.js 20.x, TypeScript 5.x)
- API specifications (Telegram webhook, Lambda APIs, Gemini integration)  
- Data specifications and schemas
- Security requirements
- Performance constraints
- AWS SAM deployment configuration

### 🏗️ Architecture Documents

#### [Architecture Plan](docs/architecture-plan.md)

Comprehensive architectural blueprint including:

- System architecture overview with diagram
- Component specifications for all Lambda functions
- Database schema (PostgreSQL with Sequelize)
- Technology stack details
- Security architecture
- Scalability considerations
- Cost optimization strategies
- Migration path from MVP to production

#### [Infrastructure as Code](docs/section-8.2-infrastructure-as-code.md)

AWS SAM implementation details:

- Complete SAM template structure
- Environment configuration
- Deployment commands
- Local development setup
- Benefits of SAM over alternatives

### 💾 Database Documentation

#### [Database Migration Plan](docs/database-migration-plan.md)

Sequelize setup with specific requirements:

- Integer IDs (not UUIDs)
- camelCase column naming
- No database enums (TypeScript validation instead)
- Complete schema definitions
- Migration strategy

#### [Database Implementation Details](docs/database-implementation-details.md)

Technical implementation specifics:

- Sequelize v6 with TypeScript decorators
- Model examples with decorators
- Dependencies and versions
- Configuration structure
- Environment variables

### 🚀 Implementation Guides

#### [Implementation Roadmap](docs/implementation-roadmap.md)

8-phase development plan over 8-9 weeks:

- **Phase 1**: Project Setup & Basic Infrastructure (Days 1-3)
- **Phase 2**: Minimal Viable Bot with Stubs (Days 4-7)
- **Phase 3**: Database & User Management (Week 2)
- **Phase 4**: S3 Integration & File Handling (Week 3)
- **Phase 5**: Chapter Processing Pipeline (Weeks 4-5)
- **Phase 6**: AI Integration & Content Processing (Weeks 6-7)
- **Phase 7**: Production Readiness (Week 8)
- **Phase 8**: Monitoring & Optimization (Week 8-9)

#### [Quick Start Deployment](docs/quick-start-deployment.md)

Day 1 deployment guide:

- Minimal setup for immediate deployment
- Stub bot implementation
- Progressive enhancement strategy
- Cost estimates
- Common issues and solutions

### 🔧 Configuration Examples

#### [AWS SAM Examples](docs/aws-sam-examples.md)

Complete configuration examples:

- Main SAM template (template.yaml)
- SAM configuration file (samconfig.toml)
- Local testing configuration
- Event examples for testing
- Deployment scripts
- Environment variables reference

## Key Project Characteristics

### Technical Stack

- **Runtime**: Node.js 20.x with TypeScript
- **Framework**: Grammy (Telegram bot framework)
- **Cloud**: AWS (Lambda, S3, RDS PostgreSQL, SQS)
- **AI**: Google Gemini API
- **IaC**: AWS SAM
- **ORM**: Sequelize v6 with TypeScript decorators
- **Logging**: Pino
- **Linting**: ESLint + Prettier

### Architecture Highlights

- Serverless architecture using AWS Lambda
- Event-driven processing pipeline
- S3-triggered Lambda functions for PDF processing
- SQS for reliable message queuing
- PostgreSQL for persistent data storage

### Development Approach

- Early deployment with stub implementations
- Iterative development with continuous deployment
- No staging environment (only dev and prod)
- Cost-conscious design (~$140-180/month for 150 books)

### Key Features

- PDF book upload via Telegram
- AI-powered chapter detection and analysis
- Three condensation levels
- Progress tracking and notifications
- User quota management (10 books/month free tier)
- Automatic cleanup with S3 lifecycle policies

## Quick Reference

### Environment Setup

```bash
# Initialize project
npm init -y
npm install typescript @types/node grammy aws-sdk
npm install -D eslint prettier @typescript-eslint/parser

# Deploy to AWS
sam build
sam deploy --guided
```

### Project Structure

```
bookomol/
├── src/
│   ├── handlers/      # Lambda function handlers
│   ├── services/      # Business logic
│   ├── database/      # Models and migrations
│   ├── utils/         # Utilities
│   └── config/        # Configuration
├── docs/              # Documentation
├── infrastructure/    # SAM templates
└── scripts/           # Deployment scripts
```

### Key Commands

- `npm run build` - Build TypeScript
- `npm run lint` - Run ESLint
- `npm run format` - Format with Prettier
- `npm run deploy:dev` - Deploy to dev
- `npm run deploy:prod` - Deploy to production

## Using This Document

When working with Claude AI on this project:

1. Reference this AGENTS.md file for project context
2. Specify which phase or component you're working on
3. Mention any specific requirements or constraints
4. Use the linked documentation for detailed information

This documentation represents the complete architectural and implementation plan for Bookomol, emphasizing early deployment, cost efficiency, and scalable serverless design.
