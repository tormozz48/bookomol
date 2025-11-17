import { PDFDocument } from "pdf-lib";
import * as pdfParse from "pdf-parse";
import { ChapterInfo } from "../../types";
import { logger } from "../logger";

export class PdfProcessor {
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      logger.info("PDF text extracted", { 
        pages: data.numpages,
        textLength: data.text.length 
      });
      return data.text;
    } catch (error) {
      logger.error("Failed to extract text from PDF", { error });
      throw error;
    }
  }

  async getPageCount(buffer: Buffer): Promise<number> {
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      const pageCount = pdfDoc.getPageCount();
      logger.info("PDF page count extracted", { pageCount });
      return pageCount;
    } catch (error) {
      logger.error("Failed to get PDF page count", { error });
      throw error;
    }
  }

  async extractChapter(buffer: Buffer, chapter: ChapterInfo): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      const newPdf = await PDFDocument.create();
      
      // Ensure we don't go beyond the document bounds
      const totalPages = pdfDoc.getPageCount();
      const startPage = Math.max(1, chapter.startPage);
      const endPage = Math.min(totalPages, chapter.endPage);
      
      if (startPage > endPage) {
        throw new Error(`Invalid page range: ${startPage}-${endPage}`);
      }

      // Copy the specified pages (PDF-lib uses 0-based indexing)
      const pageIndices = Array.from(
        { length: endPage - startPage + 1 }, 
        (_, i) => startPage - 1 + i
      );
      
      const pages = await newPdf.copyPages(pdfDoc, pageIndices);
      pages.forEach(page => newPdf.addPage(page));
      
      const chapterBuffer = Buffer.from(await newPdf.save());
      
      logger.info("Chapter extracted from PDF", {
        chapterTitle: chapter.title,
        pageRange: `${startPage}-${endPage}`,
        outputSize: chapterBuffer.length
      });
      
      return chapterBuffer;
    } catch (error) {
      logger.error("Failed to extract chapter from PDF", {
        chapter: chapter.title,
        pageRange: `${chapter.startPage}-${chapter.endPage}`,
        error
      });
      throw error;
    }
  }

  async combineChapters(chapterBuffers: Buffer[], metadata?: {
    title?: string;
    author?: string;
  }): Promise<Buffer> {
    try {
      const combinedPdf = await PDFDocument.create();
      
      // Set metadata if provided
      if (metadata?.title) {
        combinedPdf.setTitle(metadata.title);
      }
      if (metadata?.author) {
        combinedPdf.setAuthor(metadata.author);
      }
      combinedPdf.setCreator("Bookomol");
      combinedPdf.setCreationDate(new Date());

      // Combine all chapter PDFs
      for (let i = 0; i < chapterBuffers.length; i++) {
        const chapterPdf = await PDFDocument.load(chapterBuffers[i]);
        const pages = await combinedPdf.copyPages(chapterPdf, chapterPdf.getPageIndices());
        pages.forEach(page => combinedPdf.addPage(page));
        
        logger.debug("Chapter added to combined PDF", { 
          chapterIndex: i + 1,
          pages: pages.length 
        });
      }
      
      const combinedBuffer = Buffer.from(await combinedPdf.save());
      
      logger.info("Chapters combined into single PDF", {
        chapterCount: chapterBuffers.length,
        totalPages: combinedPdf.getPageCount(),
        outputSize: combinedBuffer.length
      });
      
      return combinedBuffer;
    } catch (error) {
      logger.error("Failed to combine chapter PDFs", {
        chapterCount: chapterBuffers.length,
        error
      });
      throw error;
    }
  }

  async createTextPdf(text: string, metadata?: {
    title?: string;
    author?: string;
  }): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.create();
      
      // Set metadata
      if (metadata?.title) {
        pdfDoc.setTitle(metadata.title);
      }
      if (metadata?.author) {
        pdfDoc.setAuthor(metadata.author);
      }
      pdfDoc.setCreator("Bookomol");
      pdfDoc.setCreationDate(new Date());

      // Split text into pages (approximate 50 lines per page)
      const lines = text.split('\n');
      const linesPerPage = 50;
      const fontSize = 12;
      const margin = 72; // 1 inch margins
      
      for (let i = 0; i < lines.length; i += linesPerPage) {
        const page = pdfDoc.addPage([612, 792]); // Standard letter size
        const pageLines = lines.slice(i, i + linesPerPage);
        
        let yPosition = 720; // Start near top of page
        
        for (const line of pageLines) {
          if (yPosition < margin) break; // Don't write below margin
          
          page.drawText(line.substring(0, 80), { // Limit line length
            x: margin,
            y: yPosition,
            size: fontSize,
          });
          
          yPosition -= fontSize + 2; // Move down for next line
        }
      }
      
      const buffer = Buffer.from(await pdfDoc.save());
      
      logger.info("Text converted to PDF", {
        textLength: text.length,
        pages: pdfDoc.getPageCount(),
        outputSize: buffer.length
      });
      
      return buffer;
    } catch (error) {
      logger.error("Failed to create PDF from text", { error });
      throw error;
    }
  }

  validatePdf(buffer: Buffer): { isValid: boolean; error?: string } {
    try {
      // Basic PDF validation - check for PDF header
      const header = buffer.slice(0, 4).toString();
      if (!header.startsWith('%PDF')) {
        return { 
          isValid: false, 
          error: "File does not appear to be a valid PDF" 
        };
      }

      // Check minimum size (1KB)
      if (buffer.length < 1024) {
        return { 
          isValid: false, 
          error: "File is too small to be a valid PDF" 
        };
      }

      // Check maximum size (100MB)
      if (buffer.length > 100 * 1024 * 1024) {
        return { 
          isValid: false, 
          error: "File is too large (maximum 100MB allowed)" 
        };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: "Failed to validate PDF file" 
      };
    }
  }
}