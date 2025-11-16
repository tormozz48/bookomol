# AWS SAM Configuration Examples for Bookomol

This document contains example configuration files for deploying Bookomol using AWS SAM.

## Main SAM Template (template.yaml)

```yaml
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
      BackupRetentionPeriod: 7

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

## SAM Configuration File (samconfig.toml)

```toml
version = 0.1

[default]
[default.deploy]
[default.deploy.parameters]
stack_name = "bookomol"
s3_bucket = "aws-sam-cli-managed-default-samclisourcebucket-xxxxx"
s3_prefix = "bookomol"
region = "us-east-1"
capabilities = "CAPABILITY_IAM"
parameter_overrides = """
  Environment=dev \
  TelegramBotToken=your-dev-bot-token \
  GeminiApiKey=your-dev-gemini-key \
  DatabasePassword=your-dev-db-password
"""

[prod]
[prod.deploy]
[prod.deploy.parameters]
stack_name = "bookomol-prod"
parameter_overrides = """
  Environment=prod \
  TelegramBotToken=your-prod-bot-token \
  GeminiApiKey=your-prod-gemini-key \
  DatabasePassword=your-prod-db-password
"""
capabilities = "CAPABILITY_IAM"
confirm_changeset = true
```

## Local Testing Configuration (local-env.json)

```json
{
  "BotHandlerFunction": {
    "TELEGRAM_BOT_TOKEN": "test-bot-token",
    "S3_BUCKET": "local-bucket",
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_USER": "dbadmin",
    "DB_PASSWORD": "localpassword",
    "DB_NAME": "bookomol",
    "NODE_ENV": "development"
  },
  "ChapterSplitterFunction": {
    "TELEGRAM_BOT_TOKEN": "test-bot-token",
    "GEMINI_API_KEY": "test-gemini-key",
    "S3_BUCKET": "local-bucket",
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_USER": "dbadmin",
    "DB_PASSWORD": "localpassword",
    "DB_NAME": "bookomol",
    "NODE_ENV": "development"
  },
  "ChapterProcessorFunction": {
    "TELEGRAM_BOT_TOKEN": "test-bot-token",
    "GEMINI_API_KEY": "test-gemini-key",
    "S3_BUCKET": "local-bucket",
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_USER": "dbadmin",
    "DB_PASSWORD": "localpassword",
    "DB_NAME": "bookomol",
    "NODE_ENV": "development"
  },
  "BookAssemblerFunction": {
    "TELEGRAM_BOT_TOKEN": "test-bot-token",
    "S3_BUCKET": "local-bucket",
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_USER": "dbadmin",
    "DB_PASSWORD": "localpassword",
    "DB_NAME": "bookomol",
    "NODE_ENV": "development"
  }
}
```

## Test Event Examples

### Webhook Event (events/test-webhook.json)

```json
{
  "body": "{\"update_id\":123456789,\"message\":{\"message_id\":1,\"from\":{\"id\":12345678,\"is_bot\":false,\"first_name\":\"Test\",\"username\":\"testuser\"},\"chat\":{\"id\":12345678,\"first_name\":\"Test\",\"username\":\"testuser\",\"type\":\"private\"},\"date\":1234567890,\"text\":\"/start\"}}",
  "httpMethod": "POST",
  "path": "/webhook/test-token",
  "headers": {
    "Content-Type": "application/json",
    "X-Telegram-Bot-Api-Secret-Token": "test-secret"
  }
}
```

### S3 Event (events/s3-upload.json)

```json
{
  "Records": [
    {
      "eventVersion": "2.1",
      "eventSource": "aws:s3",
      "awsRegion": "us-east-1",
      "eventTime": "2024-01-01T00:00:00.000Z",
      "eventName": "ObjectCreated:Put",
      "s3": {
        "bucket": {
          "name": "bookomol-storage-dev",
          "arn": "arn:aws:s3:::bookomol-storage-dev"
        },
        "object": {
          "key": "original/user123/job456/test-book.pdf",
          "size": 1024000,
          "eTag": "d41d8cd98f00b204e9800998ecf8427e"
        }
      }
    }
  ]
}
```

## Deployment Scripts

### deploy.sh

```bash
#!/bin/bash

# Build and deploy script for Bookomol SAM application

set -e

# Check if environment is provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh [dev|prod]"
    exit 1
fi

ENVIRONMENT=$1

echo "Building SAM application..."
sam build

echo "Deploying to $ENVIRONMENT environment..."
if [ "$ENVIRONMENT" == "dev" ]; then
    sam deploy --config-env default
elif [ "$ENVIRONMENT" == "prod" ]; then
    sam deploy --config-env prod --confirm-changeset
else
    echo "Invalid environment: $ENVIRONMENT"
    exit 1
fi

echo "Deployment complete!"
```

### local-test.sh

```bash
#!/bin/bash

# Local testing script for Bookomol

set -e

echo "Starting local SAM API..."
sam local start-api --env-vars local-env.json --docker-network host &

echo "Waiting for API to start..."
sleep 5

echo "Testing webhook endpoint..."
curl -X POST \
  http://localhost:3000/webhook/test-token \
  -H 'Content-Type: application/json' \
  -H 'X-Telegram-Bot-Api-Secret-Token: test-secret' \
  -d '{
    "update_id": 123456789,
    "message": {
      "message_id": 1,
      "from": {
        "id": 12345678,
        "first_name": "Test"
      },
      "chat": {
        "id": 12345678,
        "type": "private"
      },
      "text": "/start"
    }
  }'

echo "Test complete!"
```

## Common Commands

```bash
# Initialize SAM application (first time only)
sam init

# Build the application
sam build

# Deploy with guided prompts (first deployment)
sam deploy --guided

# Deploy to specific environment
sam deploy --config-env prod

# Local testing
sam local start-api --env-vars local-env.json

# Invoke specific function locally
sam local invoke BotHandlerFunction --event events/test-webhook.json

# View logs from deployed function
sam logs -n BotHandlerFunction --stack-name bookomol --tail

# Delete the stack
sam delete --stack-name bookomol
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| NODE_ENV | Environment name (dev/prod) | Yes |
| TELEGRAM_BOT_TOKEN | Telegram Bot API token | Yes |
| GEMINI_API_KEY | Google Gemini API key | Yes |
| S3_BUCKET | S3 bucket name for file storage | Yes |
| DB_HOST | PostgreSQL database host | Yes |
| DB_PORT | PostgreSQL database port | Yes |
| DB_USER | PostgreSQL database user | Yes |
| DB_PASSWORD | PostgreSQL database password | Yes |
| DB_NAME | PostgreSQL database name | Yes |
| QUEUE_URL | SQS queue URL for status updates | Yes |