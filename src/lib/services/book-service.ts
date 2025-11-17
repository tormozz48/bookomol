import { v4 as uuidv4 } from "uuid";
import { Book, Chapter, ChapterInfo } from "../../types";
import { DynamoDBService } from "../aws/dynamodb";
import { S3Service } from "../aws/s3";
import { SQSService } from "../aws/sqs";
import { PdfProcessor } from "../pdf/processor";
import { GeminiClient } from "../ai/gemini-client";
import { logger, createLogger } from "../logger";

export class BookService {
  private db: DynamoDBService;
  private s3: S3Service;
  private sqs: SQSService;
  private pdfProcessor: PdfProcessor;
  private gemini: GeminiClient;

  constructor(
    booksTable: string,
    sessionsTable: string,
    bucketName: string,
    processingQueueUrl: string,
    progressQueueUrl: string,
    geminiApiKey: string
  ) {
    this.db = new DynamoDBService(booksTable, sessionsTable);
    this.s3 = new S3Service(bucketName);
    this.sqs = new SQSService(processingQueueUrl, progressQueueUrl);
    this.pdfProcessor = new PdfProcessor();
    this.gemini = new GeminiClient(geminiApiKey);
  }

  async createBook(params: {
    userId: string;
    chatId: string;
    messageId: string;
    condensingLevel: "light" | "medium" | "heavy";
    fileName: string;
    fileSize: number;
  }): Promise<Book> {
    const bookId = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const book: Book = {
      bookId,
      userId: params.userId,
      messageId: params.messageId,
      chatId: params.chatId,
      originalUrl: "",
      title: params.fileName.replace(/\.pdf$/i, ""),
      pageCount: 0,
      condensingLevel: params.condensingLevel,
      status: "uploading",
      progress: 0,
      currentStep: "Initializing...",
      chapters: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    await this.db.createBook(book);

    logger.info("Book created", { 
      bookId, 
      userId: params.userId,
      fileName: params.fileName,
      condensingLevel: params.condensingLevel
    });

    return book;
  }

  async uploadOriginalPdf(bookId: string, pdfBuffer: Buffer): Promise<void> {
    const bookLogger = createLogger({ bookId });
    
    try {
      // Validate PDF
      const validation = this.pdfProcessor.validatePdf(pdfBuffer);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Extract metadata
      const text = await this.pdfProcessor.extractText(pdfBuffer);
      const pageCount = await this.pdfProcessor.getPageCount(pdfBuffer);
      const metadata = await this.gemini.extractBookMetadata(text);

      // Upload to S3
      const s3Key = `original/${bookId}.pdf`;
      const s3Url = await this.s3.uploadFile(s3Key, pdfBuffer, "application/pdf");

      // Update book record
      await this.db.updateBook(bookId, {
        originalUrl: s3Url,
        pageCount,
        title: metadata.title || `Book ${bookId}`,
        author: metadata.author,
        status: "queued",
        progress: 5,
        currentStep: "PDF uploaded, queued for processing...",
        updatedAt: new Date().toISOString(),
      });

      bookLogger.info("Original PDF uploaded", {
        s3Key,
        pageCount,
        fileSize: pdfBuffer.length,
        title: metadata.title
      });

    } catch (error) {
      bookLogger.error("Failed to upload original PDF", { error });
      await this.markFailed(bookId, `Upload failed: ${error.message}`);
      throw error;
    }
  }

  async startProcessing(bookId: string): Promise<void> {
    const bookLogger = createLogger({ bookId });

    try {
      const book = await this.db.getBook(bookId);
      if (!book) {
        throw new Error("Book not found");
      }

      // Update status to processing
      await this.db.updateBook(bookId, {
        status: "processing",
        progress: 10,
        currentStep: "Starting processing...",
        updatedAt: new Date().toISOString(),
      });

      // Queue the book for processing
      await this.sqs.queueBookProcessing(bookId, book.userId);

      bookLogger.info("Book processing started");

    } catch (error) {
      bookLogger.error("Failed to start processing", { error });
      await this.markFailed(bookId, `Processing start failed: ${error.message}`);
      throw error;
    }
  }

  async processChapters(bookId: string): Promise<void> {
    const bookLogger = createLogger({ bookId });

    try {
      const book = await this.db.getBook(bookId);
      if (!book) {
        throw new Error("Book not found");
      }

      // Download original PDF
      const s3Key = book.originalUrl.replace(`s3://${this.s3['bucketName']}/`, "");
      const pdfBuffer = await this.s3.downloadFile(s3Key);

      // Extract text and identify chapters
      const text = await this.pdfProcessor.extractText(pdfBuffer);
      const chaptersInfo = await this.gemini.identifyChapters(text);

      // Convert to Chapter objects
      const chapters: Chapter[] = chaptersInfo.map((info, index) => ({
        chapterId: `${bookId}_chapter_${index + 1}`,
        title: info.title,
        pageStart: info.startPage,
        pageEnd: info.endPage,
        isEssential: info.isEssential || true,
        status: info.isEssential ? "pending" : "skipped",
      }));

      // Update book with chapters
      await this.db.updateBook(bookId, {
        chapters,
        progress: 25,
        currentStep: `Found ${chapters.length} chapters, processing essential ones...`,
        updatedAt: new Date().toISOString(),
      });

      // Queue essential chapters for condensing
      const essentialChapters = chapters.filter(ch => ch.isEssential);
      for (const chapter of essentialChapters) {
        await this.sqs.queueChapterCondensing(bookId, book.userId, chapter.chapterId);
      }

      bookLogger.info("Chapters identified and queued", {
        totalChapters: chapters.length,
        essentialChapters: essentialChapters.length,
        skippedChapters: chapters.length - essentialChapters.length
      });

    } catch (error) {
      bookLogger.error("Failed to process chapters", { error });
      await this.markFailed(bookId, `Chapter processing failed: ${error.message}`);
      throw error;
    }
  }

  async condenseChapter(bookId: string, chapterId: string): Promise<void> {
    const bookLogger = createLogger({ bookId, chapterId });

    try {
      const book = await this.db.getBook(bookId);
      if (!book) {
        throw new Error("Book not found");
      }

      const chapter = book.chapters.find(ch => ch.chapterId === chapterId);
      if (!chapter) {
        throw new Error("Chapter not found");
      }

      // Mark chapter as processing
      chapter.status = "processing";
      await this.db.updateBook(bookId, {
        chapters: book.chapters,
        updatedAt: new Date().toISOString(),
      });

      // Download original PDF and extract chapter
      const s3Key = book.originalUrl.replace(`s3://${this.s3['bucketName']}/`, "");
      const pdfBuffer = await this.s3.downloadFile(s3Key);

      const chapterPdf = await this.pdfProcessor.extractChapter(pdfBuffer, {
        title: chapter.title,
        startPage: chapter.pageStart,
        endPage: chapter.pageEnd,
      });

      // Extract text from chapter
      const chapterText = await this.pdfProcessor.extractText(chapterPdf);

      // Condense the chapter
      const condensedText = await this.gemini.condenseChapter(chapterText, {
        level: book.condensingLevel,
      });

      // Create condensed PDF
      const condensedPdf = await this.pdfProcessor.createTextPdf(condensedText, {
        title: `${book.title} - ${chapter.title} (Condensed)`,
        author: book.author,
      });

      // Upload condensed chapter
      const condensedS3Key = `condensed/${bookId}/${chapterId}.pdf`;
      const condensedUrl = await this.s3.uploadFile(condensedS3Key, condensedPdf, "application/pdf");

      // Update chapter status
      chapter.status = "completed";
      chapter.condensedUrl = condensedUrl;

      await this.db.updateBook(bookId, {
        chapters: book.chapters,
        updatedAt: new Date().toISOString(),
      });

      bookLogger.info("Chapter condensed successfully", {
        originalSize: chapterText.length,
        condensedSize: condensedText.length,
        compressionRatio: Math.round((1 - condensedText.length / chapterText.length) * 100)
      });

      // Check if all essential chapters are complete
      const essentialChapters = book.chapters.filter(ch => ch.isEssential);
      const completedChapters = essentialChapters.filter(ch => ch.status === "completed");
      
      if (completedChapters.length === essentialChapters.length) {
        // All chapters done, combine them
        await this.sqs.queueChaptersCombining(bookId, book.userId);
      } else {
        // Update progress
        const progressPercent = 30 + Math.round((completedChapters.length / essentialChapters.length) * 60);
        await this.db.updateBook(bookId, {
          progress: progressPercent,
          currentStep: `Condensed ${completedChapters.length}/${essentialChapters.length} chapters...`,
        });
      }

    } catch (error) {
      bookLogger.error("Failed to condense chapter", { error });
      
      // Mark chapter as failed but continue with others
      const book = await this.db.getBook(bookId);
      if (book) {
        const chapter = book.chapters.find(ch => ch.chapterId === chapterId);
        if (chapter) {
          chapter.status = "skipped"; // Skip failed chapters
          await this.db.updateBook(bookId, {
            chapters: book.chapters,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      throw error;
    }
  }

  async combineCondensedChapters(bookId: string): Promise<void> {
    const bookLogger = createLogger({ bookId });

    try {
      const book = await this.db.getBook(bookId);
      if (!book) {
        throw new Error("Book not found");
      }

      // Get all completed chapters
      const completedChapters = book.chapters.filter(ch => 
        ch.status === "completed" && ch.condensedUrl
      );

      if (completedChapters.length === 0) {
        throw new Error("No condensed chapters to combine");
      }

      // Download all condensed chapters
      const chapterBuffers: Buffer[] = [];
      for (const chapter of completedChapters) {
        const s3Key = chapter.condensedUrl!.replace(`s3://${this.s3['bucketName']}/`, "");
        const buffer = await this.s3.downloadFile(s3Key);
        chapterBuffers.push(buffer);
      }

      // Combine chapters
      const combinedPdf = await this.pdfProcessor.combineChapters(chapterBuffers, {
        title: `${book.title} (Condensed - ${book.condensingLevel})`,
        author: book.author,
      });

      // Upload combined PDF
      const combinedS3Key = `final/${bookId}_condensed.pdf`;
      const condensedUrl = await this.s3.uploadFile(combinedS3Key, combinedPdf, "application/pdf");

      // Generate download URL (24 hour expiry)
      const downloadUrl = await this.s3.getPresignedUrl(combinedS3Key, 24 * 60 * 60);

      // Mark book as completed
      await this.db.updateBook(bookId, {
        status: "completed",
        progress: 100,
        currentStep: "Condensed book ready for download!",
        condensedUrl,
        downloadUrl,
        updatedAt: new Date().toISOString(),
      });

      // Send completion notification
      await this.sqs.sendProgressMessage({
        bookId,
        userId: book.userId,
        chatId: book.chatId,
        messageId: book.messageId,
        progress: 100,
        status: "completed",
        currentStep: "🎉 Your condensed book is ready! Click below to download.",
      });

      bookLogger.info("Book processing completed", {
        chaptersProcessed: completedChapters.length,
        finalSize: combinedPdf.length,
        downloadUrl
      });

    } catch (error) {
      bookLogger.error("Failed to combine chapters", { error });
      await this.markFailed(bookId, `Final assembly failed: ${error.message}`);
      throw error;
    }
  }

  async markFailed(bookId: string, errorMessage: string): Promise<void> {
    await this.db.updateBook(bookId, {
      status: "failed",
      error: errorMessage,
      updatedAt: new Date().toISOString(),
    });

    // Send failure notification
    const book = await this.db.getBook(bookId);
    if (book) {
      await this.sqs.sendProgressMessage({
        bookId,
        userId: book.userId,
        chatId: book.chatId,
        messageId: book.messageId,
        progress: 0,
        status: "failed",
        currentStep: `❌ Processing failed: ${errorMessage}`,
      });
    }

    logger.error("Book processing failed", { bookId, error: errorMessage });
  }

  async getBook(bookId: string): Promise<Book | null> {
    return this.db.getBook(bookId);
  }

  async getUserBooks(userId: string): Promise<Book[]> {
    return this.db.getBooksByUser(userId);
  }

  async updateProgress(bookId: string, progress: number, currentStep: string): Promise<void> {
    await this.db.updateBook(bookId, {
      progress,
      currentStep,
      updatedAt: new Date().toISOString(),
    });

    // Send progress update
    const book = await this.db.getBook(bookId);
    if (book) {
      await this.sqs.sendProgressMessage({
        bookId,
        userId: book.userId,
        chatId: book.chatId,
        messageId: book.messageId,
        progress,
        status: book.status,
        currentStep,
      });
    }
  }
}