# I need to setup a new project for make uploaded pdf books condensed.

## Problem Description

There are a lot of technical books in pdf format, that are big in size and take a lot of time to read.
For example O'Reilly books are around 500 pages and take a lot of time to read.

## Project Description

I want to create a project, that will allow me to upload pdf books and make them condensed.
Book parsing, analysis and condensing should be done via LLM API.
Use some generic AI SDK but use Google Gemini API by default.

## Project Features

- User should be able to authenticate via Google

For authenticated user:

- User should be able to view his library e.g. list of uploaded pdf books
- User should be able to upload new pdf book with settings for condensing
- User should be able to view original pdf book with preview
- User should be able to view condensed pdf book with preview
- User should be able to download condensed pdf book
- User should be able to delete original pdf book
- User should be able to delete condensed pdf book
- User should able to logout

## Project Hosting Technologies

Project should be deployed at google cloud ecosystem

Frontend: Cloud Run or Firebase Hosting
Backend: Node.js on Cloud Run
Storage: Google Cloud Storage
Background Processing: Cloud Run Jobs or Cloud Functions
Database: Firestore or PostgreSQL
Queue: Pub/Sub
WebSocket: Cloud Run

## Third-party runtime services

### Production:

- Google Cloud Storage
- Google Cloud Functions
- Google Cloud Run
- Google Cloud Pub/Sub
- Google Cloud Firestore
- Google Cloud PostgreSQL

### Development

It should be easily to run project locally in docker and docker-compose

- Use PostgreSQL database in Docker compose
- Use Redis as base for Pub/Sub in development
- Use Minio as replacement of cloud storage for development

## Project service structure

- Web-service based on NodeJS
- Backgound worker or set of background workers based on NodeJS
- UI on React + Vite

Project should be initiated as monorepo with turbo package usage

## Book processing flow

- User uploads pdf book via presigned url
- Original pdf book is stored in cloud storage
- Background worker (initial worker) downloads original pdf book from cloud storage
- Background worker (initial worker) splits pdf book into chapters via LLM API
- Each chapter is saved in cloud storage as separated file
- Multiple chapters can be processed in parallel by workers
- Some chapters can be skipped according to prompt
- Chapters are processing in parallel by workers
- Condensed chapters are saved in cloud storage as separated files
- Initial worker combines condensed chapters into one pdf book
- Condensed pdf book is stored in cloud storage
- Each worker reports it progress to pub/sub
- Initial worker reports it progress to pub/sub
- UI is updated via WebSocket and show processing progress and status of user's book
- Finally user can download condensed pdf book which appears in library

Think about using Temporal library instead of pub/sub for organization of background processing flow.

## Steps

### Preparation

1. Create project structure as turbo monorepo
2. For each service create package.json files with initial configuration
3. For each service setup typescript configuration with recommended settings
4. For each service setup eslint configuration with recommended settings
5. For each service setup prettier configuration with recommended settings
6. For each service setup vite build and recommended vite ecosystem for local development and testing

### CI and CD

1. Setup docker and docker-compose for local development
2. Setup GitHub Actions for CI/CD pipeline
3. Setup Google Cloud Run for deployment
4. Setup Google Cloud Storage for storage
5. Setup Google Cloud Functions for background processing
6. Setup Google Cloud Pub/Sub for queue
7. Setup Google Cloud PostgreSQL for database

After this steps project should be ready for deployment on Google Cloud on each commit to main branch
Also project should be easily to run locally in docker and docker-compose with hot reloading of each service.

### Development

1. Use fastify as web framework
2. Use react as frontend framework
3. Use vite as build tool

On this stage we should create web application with following features:

1. User authentication via Google
2. User should be able to view his library e.g. list of uploaded pdf books
3. User should be able to upload new pdf book with settings for condensing
4. User should be able to view original pdf book with preview
5. User should be able to view condensed pdf book with preview
6. User should be able to download condensed pdf book
7. User should able to logout

Meta information should be stored in SQL database
Original pdf book should be stored in cloud storage
Condensed pdf book should be stored in cloud storage
On this stage it is not required to implement any kind of file processing. We can simply create condensed pdf book as copy of original pdf book.

On this stage we should create UI for web application:

1. Use material UI as frontend components library.
2. Use React Router for routing.
3. Use React Query for data fetching.
4. Use React Hook Form for form handling.
5. Use React Dropzone for file upload.
6. Use React PDF for pdf preview.
7. Use React PDF for pdf download.

Follow best practices for web application development with mentioned set of libraries and tools.

Web application should be responsive and mobile-friendly.
Web application should have dark and light themes.
Web application should have user authentication via Google.

For unauthenticated user index page should have:

1. Google sign in button in top right corner
2. Some top navigation bar with logo
3. Some bottom navigation bar with links to about page and contact page
4. Some main content area with some text and some image

For authenticated user index page should have:

1. Some top navigation bar with logo and user avatar. It should be able to logout
2. Some bottom navigation bar with links to about page and contact page
3. Some main content area:
  Main content area should have:
  Dropzone for file upload.

  List of cards with uploaded pdf books preview. Each card should have:
    1. Book name
    2. Book cover image
    3. Book description
    4. Book upload date
    5. Book processing status
    6. Book processing progress
    7. Number of pages of original book
    8. Number of pages of condensed book
    9. Link for download original book
    10. Link for download condensed book

Don't implement any kind of file processing on this stage. We can simply create condensed pdf book as copy of original pdf book. It can be done on next stage.