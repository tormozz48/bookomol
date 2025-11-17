import { GoogleGenerativeAI } from "@google/generative-ai";
import { CondensingOptions, ChapterInfo } from "../../types";
import { logger } from "../logger";

export class GeminiClient {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async identifyChapters(text: string): Promise<ChapterInfo[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
        Analyze this PDF book text and identify all chapters with their approximate page numbers.
        Also determine which chapters are essential (main technical content) vs non-essential (preface, acknowledgments, index, bibliography, etc.).
        
        Return ONLY a JSON array with this exact structure:
        [
          {
            "title": "Chapter title",
            "startPage": 1,
            "endPage": 50,
            "isEssential": true
          }
        ]
        
        Guidelines:
        - Mark preface, foreword, acknowledgments, about the author, bibliography, index, appendices as non-essential
        - Mark main chapters, core content, tutorials, examples as essential
        - Estimate page numbers based on content structure
        - Keep titles concise but descriptive
        
        Book text: ${text.substring(0, 8000)}...
      `;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in AI response");
      }

      const chapters = JSON.parse(jsonMatch[0]) as ChapterInfo[];
      
      logger.info("Chapters identified", { 
        totalChapters: chapters.length,
        essentialChapters: chapters.filter(ch => ch.isEssential).length 
      });

      return chapters;
    } catch (error) {
      logger.error("Failed to identify chapters", { error });
      throw error;
    }
  }

  async condenseChapter(text: string, options: CondensingOptions): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompts = {
        light: `
          Condense this technical chapter by approximately 30% while preserving:
          - All code examples and snippets
          - Detailed explanations of complex concepts
          - Step-by-step instructions
          - Important warnings and notes
          - Key diagrams and illustrations (describe them)
          
          Remove:
          - Redundant explanations
          - Excessive verbose descriptions
          - Repetitive examples that make the same point
        `,
        medium: `
          Condense this technical chapter by approximately 50% while preserving:
          - Core technical concepts and principles
          - Essential code examples (keep the most important ones)
          - Key explanations and definitions
          - Critical warnings and notes
          
          Remove:
          - Most detailed examples
          - Verbose explanations
          - Non-essential background information
          - Redundant content
        `,
        heavy: `
          Condense this technical chapter by approximately 70%, extracting only:
          - Core concepts and key principles
          - Essential definitions and terminology
          - Critical implementation patterns
          - Main takeaways and conclusions
          
          Remove:
          - All examples except the most crucial ones
          - Detailed explanations
          - Background information
          - Verbose descriptions
        `,
      };

      const prompt = `
        ${prompts[options.level]}
        
        Requirements:
        - Maintain technical accuracy at all times
        - Preserve logical flow and structure
        - Use clear, concise language
        - Format output in readable markdown
        - Keep all essential technical information
        - Preserve any code syntax highlighting
        
        Chapter content to condense:
        
        ${text}
      `;

      const result = await model.generateContent(prompt);
      const condensedText = result.response.text();

      logger.info("Chapter condensed", { 
        originalLength: text.length,
        condensedLength: condensedText.length,
        compressionRatio: Math.round((1 - condensedText.length / text.length) * 100),
        level: options.level
      });

      return condensedText;
    } catch (error) {
      logger.error("Failed to condense chapter", { level: options.level, error });
      throw error;
    }
  }

  async generateChapterSummary(text: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
        Create a concise summary of this technical chapter that captures:
        - Main topics covered
        - Key concepts and definitions
        - Important takeaways
        - Prerequisites or dependencies mentioned
        
        Keep the summary to 2-3 paragraphs maximum.
        
        Chapter content:
        ${text.substring(0, 4000)}...
      `;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.error("Failed to generate chapter summary", { error });
      throw error;
    }
  }

  async extractBookMetadata(text: string): Promise<{ title?: string; author?: string; pageCount?: number }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
        Extract metadata from this book text. Look for:
        - Book title
        - Author name(s)
        - Approximate total page count
        
        Return ONLY a JSON object:
        {
          "title": "Book Title",
          "author": "Author Name", 
          "pageCount": 500
        }
        
        If any information is not found, omit that field.
        
        Book text: ${text.substring(0, 3000)}...
      `;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {};
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error("Failed to extract book metadata", { error });
      return {};
    }
  }
}