# I need to setup a new project for make uploaded pdf books condensed.

## Problem Description

There are a lot of technical books in pdf format, that are big in size and take a lot of time to read.
For example O'Reilly books are around 500 pages and take a lot of time to read.

## Project Description

I want to create a project as telegram bot, that will allow me to upload pdf books and make them condensed.
Book parsing, analysis and condensing should be done via LLM API.
Use some generic AI SDK but use Google Gemini API by default.

## Project Features

* user can launch telegram bot as start command
* user can run command to start some scenario of uploading pdf book and condensing it
* during this scenario user can upload pdf book and set level of condensing as some preset
* user can download condensed pdf book

## Project Hosting Technologies

Project should be deployed at AWS ecosystem

Telegram bot should be deployed at AWS Lambda
Backend: Node.js on AWS Lambda
Storage: AWS S3
Background Processing: AWS Lambda
Database: AWS RDS
Queue: AWS SQS

Let's calculate cost of AWS services for this project.

## Third-party runtime services

### Production environment

* AWS S3
* AWS Lambda
* AWS RDS
* AWS SQS

### Development environment

It should be easily to run project locally in docker and docker-compose

* Use PostgreSQL database in Docker compose
* Use Minio as replacement of cloud storage for development

## Book processing flow

1. User uploads pdf book
2. Original pdf book is stored in AWS S3 cloud storage
3. S3 bucket is configured to trigger AWS Lambda function on object creation
4. AWS Lambda function downloads original pdf book from AWS S3 cloud storage
5. AWS Lambda function splits pdf book into chapters via LLM API
6. Each chapter is saved in AWS S3 cloud storage as separated file
7. Multiple chapters can be processed in parallel by AWS Lambda functions
8. Some chapters can be skipped according to prompt
9. Chapters are processing in parallel by AWS Lambda functions
10. Condensed chapters are saved in AWS S3 cloud storage as separated files
11. AWS Lambda function combines condensed chapters into one pdf book
12. Condensed pdf book is stored in AWS S3 cloud storage
13. AWS Lambda function reports it progress to AWS SQS
14. AWS SQS is used as queue for background processing
15. Finally user can download condensed pdf book from AWS S3 cloud storage by link in telegram bot

## Steps

### Preparation

1. Create project structure as nodejs application
2. Create package.json file with initial configuration
3. Setup typescript configuration with recommended settings
4. Setup eslint configuration with recommended settings
5. Setup prettier configuration with recommended settings
6. Setup vite build and recommended vite ecosystem for local development and testing

### CI and CD

1. Setup docker and docker-compose for local development
2. Setup GitHub Actions for CI/CD pipeline
3. Setup AWS Lambda for deployment
4. Setup AWS S3 for storage

I want to have some simple infrastructure-as-code setup for this project. Think about using pulumi or terraform for this.

### Development

1. Use telegraf as telegram bot framework
2. Use aws-sdk for aws services integration
3. Use vite for build
4. Use sequelize for database integration
5. Use sequelize-cli for database migrations
6. Use sequelize-typescript for typescript integration
7. Use zod for data validation
8. Use dotenv for environment variables
9. Use pino for logging

Meta information about books should be stored in SQL database
Original pdf book should be stored in AWS S3
Condensed pdf book should be stored in AWS S3

On this stage it is not required to implement any kind of file processing. We can simply create condensed pdf book as copy of original pdf book.