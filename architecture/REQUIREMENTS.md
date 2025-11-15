# Bookomol Requirements Summary

## Project Overview
Web application that condenses PDF books using AI/LLM technology while preserving essential content like code examples and diagrams.

## Clarified Requirements from Q&A

### Book Processing
- **Compression Ratio**: 10:1 default (configurable per upload)
- **Condensing Levels**:
  - Light: 30% reduction
  - Medium: 50% reduction  
  - Heavy: 70% reduction
- **Chapter Filtering**: Auto-skip introductory/acknowledgment chapters
- **Content Preservation**: Retain all code examples and diagrams

### Technical Stack Decisions
- **Workflow Orchestration**: Google Pub/Sub (not Temporal)
- **PDF Processing**: pdf-lib or pdfjs for manipulation, LLM for chapter splitting/parsing/condensing
- **User Quotas**: 3 books per day (freemium tier)
- **API Cost Tracking**: Track per user for future billing
- **Caching**: Chapter-level caching for 1 week (implementation temporarily skipped)

### Progress & Preview
- **Progress Updates**: Chapter-by-chapter completion percentage
- **Preview Generation**: Real-time preview as independent background job
- **WebSocket Updates**: Show progress based on chapter completion

### Infrastructure
- **Environment**: Production only on Google Cloud
- **Domain**: bookomol.app (suggested)
- **Monitoring**: Google Cloud Monitoring/Logging
- **Error Tracking**: Not initially, add later

### Development Environment
- **Local Setup**: Docker Compose with:
  - PostgreSQL for database
  - Redis for Pub/Sub emulation
  - Minio for storage emulation
  - Pub/Sub emulator

## Implementation Priorities

### Phase 1 - Foundation (MVP)
1. Monorepo setup with Turbo
2. Docker Compose configuration
3. Basic API with Google OAuth
4. File upload/download functionality
5. Simple UI with Material UI

### Phase 2 - Core Processing
1. Google Cloud Storage integration
2. Pub/Sub message queue setup
3. PDF chapter splitting via LLM
4. Chapter condensing workers
5. Real-time progress updates

### Phase 3 - Production Ready
1. Google Cloud deployment
2. Monitoring and logging
3. Performance optimization
4. User quota enforcement
5. Cost tracking implementation

### Phase 4 - Enhancements
1. Billing integration
2. Advanced condensing options
3. OCR support
4. Mobile applications