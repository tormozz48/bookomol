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
I want to use sst framework for AWS organization and deploying of AWS stack [sst](https://sst.dev)

## Third-party runtime services

### Production environment

* AWS S3
* AWS Lambda
* AWS DynamoDB if needed
* AWS SQS

### Development environment

Use sst framework for AWS organization and deploying of AWS stack [sst](https://sst.dev)
Use some ability to run project locally if possible with sst framework.

## Book processing flow

1. User uploads pdf book with telegram bot
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
6. Setup sst framework with whole stack and components for AWS organization and deploying of AWS stack [sst](https://sst.dev)

### Development

1. Use grammY as telegram bot framework
2. Use vite for typescript build
3. Use pino for logging
4. Use sst framework for AWS organization and deploying of AWS stack [sst](https://sst.dev)

Meta information about books can be stored in DynamoDB database
Original pdf book should be stored in AWS S3
Condensed pdf book should be stored in AWS S3

On this stage it is not required to implement any kind of book condensing.
Let's left some stub function for condensing.
We can simply create condensed pdf book as copy of original pdf book.
