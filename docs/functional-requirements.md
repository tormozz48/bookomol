# Bookomol - PDF Book Condensing Telegram Bot

## Functional Requirements Document

### 1. Introduction

#### 1.1 Purpose

This document defines the functional requirements for Bookomol, a Telegram bot that uses AI to condense PDF books into more digestible formats while preserving key information.

#### 1.2 Scope

The system will provide Telegram users with the ability to upload PDF books and receive condensed versions based on their selected compression level. The system will use Google Gemini AI for intelligent content analysis and summarization.

#### 1.3 Definitions

- **User**: A Telegram user interacting with the bot
- **Book**: A PDF document containing textual content
- **Condensation Level**: The degree of content reduction (Brief/Standard/Comprehensive)
- **Job**: A book processing task from upload to completion
- **Chapter**: A logical section of a book identified by AI

### 2. Functional Requirements

#### 2.1 User Registration & Authentication

##### FR-101: Bot Initialization

- Users shall initiate interaction by sending `/start` command
- System shall create user profile on first interaction
- System shall display welcome message with available commands
- System shall track user's Telegram ID for authentication

#### 2.2 Book Upload Process

##### FR-201: Upload Initiation

- Users shall start upload process with `/condense` command
- System shall guide users through upload workflow
- System shall provide clear instructions for each step

##### FR-202: File Upload

- System shall accept PDF files up to 100MB
- System shall validate PDF format and readability
- System shall reject corrupted or password-protected PDFs
- System shall provide immediate feedback on upload status

##### FR-203: Condensation Level Selection

- System shall present three condensation options:
  - Brief (10-15% of original)
  - Standard (25-30% of original)
  - Comprehensive (40-50% of original)
- System shall explain each level's characteristics
- System shall remember user's last selection

#### 3.3 Book Processing

##### FR-301: Chapter Analysis

- System shall use AI to identify chapter boundaries
- System shall extract chapter titles and structure
- System shall identify table of contents

##### FR-302: Content Filtering

- System shall use AI to identify low-value content:
  - Repetitive sections
  - Pure reference materials
  - Extensive code listings (in technical books)
  - Redundant examples
- System shall automatically skip identified low-value chapters

##### FR-303: Content Condensation

- System shall process each chapter according to selected level
- System shall preserve:
  - Core concepts and main ideas
  - Important definitions
  - Key takeaways
  - Critical examples
- System shall maintain logical flow and readability

##### FR-304: Progress Tracking

- System shall provide real-time progress updates
- System shall show:
  - Current processing stage
  - Chapters completed/remaining
  - Estimated completion time
- Updates shall be sent every 30 seconds during processing

#### 3.4 Book Delivery

##### FR-401: Completion Notification

- System shall notify user when processing completes
- Notification shall include:
  - Original vs. condensed size
  - Processing time
  - Number of chapters processed/skipped

##### FR-402: Download Delivery

- System shall provide download link for condensed book
- Link shall be valid for 7 days
- System shall support direct download via Telegram

##### FR-403: Metadata Preservation

- Condensed book shall retain:
  - Original title with condensation level indicator
  - Author information
  - Publication details
  - Updated table of contents

#### 3.5 User Commands

##### FR-501: Command Structure
The bot shall support the following commands:

| Command | Description | Parameters |
|---------|-------------|------------|
| /start | Initialize bot and show welcome | None |
| /condense | Start new condensation job | None |
| /status | Check current job status | Job ID (optional) |
| /history | View processing history | None |
| /quota | Check remaining monthly quota | None |
| /help | Show help and commands | None |
| /cancel | Cancel current job | None |

##### FR-502: Command Responses

- All commands shall acknowledge receipt within 2 seconds
- Error messages shall be user-friendly and actionable
- System shall provide suggestions for common errors

#### 3.6 Error Handling

##### FR-601: Upload Errors

- System shall handle:
  - Network interruptions
  - Invalid file formats
  - Oversized files
  - Corrupted PDFs
- System shall provide clear error messages and recovery options

##### FR-603: Quota Exceeded

- System shall prevent uploads when quota exceeded
- System shall show:
  - Current usage
  - Quota reset date
  - Upgrade options (future)

### 4. Business Rules

#### BR-01: Quota Management

- Free users limited to 10 books per calendar month
- Quota resets on 1st of each month at 00:00 UTC
- Partially processed books count against quota

#### BR-02: File Size Limits

- Maximum upload size: 100MB
- Minimum file size: 100KB
- Maximum processing time: 30 minutes per book

#### BR-03: Content Restrictions

- System shall not process:
  - Encrypted PDFs
  - Image-only PDFs
  - Non-text content
- System shall detect and report unsupported content

#### BR-04: Data Retention

- Original books: Deleted after 24 hours
- Condensed books: Retained for 7 days
- Processing metadata: Retained for 30 days
- User profiles: Retained indefinitely

### 5. User Stories

#### US-01: First Time User

As a new Telegram user
I want to easily understand how to use the bot
So that I can start condensing books immediately

**Acceptance Criteria:**

- Welcome message appears after /start
- Clear instructions for uploading first book
- Example of condensation levels provided

#### US-02: Book Upload

As a user with a large technical book
I want to upload it and select a condensation level
So that I can read a shorter version

**Acceptance Criteria:**

- Upload process initiated with single command
- File upload interface is intuitive
- Condensation level selection is clear
- Confirmation before processing starts

#### US-03: Progress Monitoring

As a user waiting for book processing
I want to see real-time progress updates
So that I know the system is working

**Acceptance Criteria:**

- Updates sent every 30 seconds
- Clear indication of current stage
- Estimated completion time shown
- Ability to cancel if needed

#### US-04: Book Retrieval

As a user whose book is processed
I want to easily download the condensed version
So that I can start reading immediately

**Acceptance Criteria:**

- Clear notification when complete
- Direct download link provided
- File size comparison shown
- Link remains valid for 7 days

### 6. User Interface Requirements

#### 6.1 Conversation Flow

##### 6.1.1 Main Menu

Welcome to Bookomol! 📚

Available commands:
/condense - Start condensing a book
/status - Check processing status
/history - View your processing history
/quota - Check your remaining quota
/help - Get help

What would you like to do?

##### 6.1.2 Condensation Flow

Step 1: Upload your PDF book
→ User uploads file
Step 2: Choose condensation level:
  📄 Brief (10-15%) - Key concepts only
  📖 Standard (25-30%) - Main ideas and examples  
  📚 Comprehensive (40-50%) - Detailed summary
→ User selects level
Step 3: Confirm and start processing

##### 6.1.3 Progress Updates

Processing "Book Title" 📊

Stage: Analyzing chapters
Progress: 5/12 chapters complete
Time elapsed: 2m 30s
Estimated remaining: 5m

⏸ /status - Check again
❌ /cancel - Cancel processing

#### 6.2 Error Messages

##### 6.2.1 Invalid File

❌ Unable to process this file

Reason: File is not a valid PDF
Solution: Please upload a PDF file under 100MB

Need help? Use /help

##### 6.2.2 Quota Exceeded

❌ Monthly quota exceeded

You've used 10/10 books this month
Quota resets: March 1, 2024

Want unlimited processing? 
Coming soon: Premium subscriptions!

### 7. Performance Requirements

#### PF-01: Response Times

- Bot commands: < 2 seconds
- File upload confirmation: < 5 seconds
- Processing start: < 10 seconds
- Progress updates: Every 30 seconds

#### PF-02: Processing Times

- Small books (< 100 pages): < 5 minutes
- Medium books (100-300 pages): < 15 minutes
- Large books (300-500 pages): < 30 minutes

#### PF-03: Availability

- System uptime: 99.5% monthly
- Scheduled maintenance: Max 2 hours/month
- Graceful degradation during high load

### 8. Integration Requirements

#### INT-01: Telegram Bot API

- Support all required bot methods
- Handle webhook updates efficiently
- Implement proper error handling
- Support file uploads/downloads

#### INT-02: AI Service (Google Gemini)

- Authenticate securely with API
- Handle rate limiting gracefully
- Implement retry logic
- Monitor API usage and costs

#### INT-03: AWS Services

- Seamless S3 integration
- Efficient Lambda invocations
- Reliable SQS message handling
- Proper RDS connection management