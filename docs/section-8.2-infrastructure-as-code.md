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