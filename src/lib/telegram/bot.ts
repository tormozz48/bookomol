import { Bot, Context, SessionFlavor, session } from "grammy";
import { FileApiFlavor, hydrateFiles } from "@grammyjs/files";
import { SessionService } from "../services/session-service";
import { BookService } from "../services/book-service";
import { logger, createLogger } from "../logger";

interface SessionData {
  condensingLevel?: "light" | "medium" | "heavy";
  awaitingFile?: boolean;
  bookId?: string;
}

export type BotContext = Context & SessionFlavor<SessionData> & FileApiFlavor<Context>;

export function createTelegramBot(
  token: string,
  sessionService: SessionService,
  bookService: BookService
): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);
  
  // Enable file API
  bot.api.config.use(hydrateFiles(token));
  
  // Add session middleware
  bot.use(session({
    initial: (): SessionData => ({}),
  }));

  // Error handler
  bot.catch((err) => {
    logger.error("Bot error occurred", { error: err.error, ctx: err.ctx });
  });

  // Start command
  bot.command("start", async (ctx) => {
    const userLogger = createLogger({ userId: ctx.from?.id });
    
    try {
      await ctx.reply(
        "Welcome to Bookomol! 📚\n\n" +
        "I can help you condense technical PDF books using AI, making them faster and easier to read.\n\n" +
        "✨ *What I can do:*\n" +
        "• Condense PDF books by 30%, 50%, or 70%\n" +
        "• Skip non-essential chapters automatically\n" +
        "• Preserve important technical content\n" +
        "• Provide real-time progress updates\n\n" +
        "📖 *Use /condense to start processing a book*\n" +
        "❓ *Use /help for more information*",
        { parse_mode: "Markdown" }
      );

      userLogger.info("User started bot");
    } catch (error) {
      userLogger.error("Failed to send start message", { error });
    }
  });

  // Help command
  bot.command("help", async (ctx) => {
    try {
      await ctx.reply(
        "📚 *Bookomol Help*\n\n" +
        "*Commands:*\n" +
        "• `/condense` - Start condensing a PDF book\n" +
        "• `/help` - Show this help message\n\n" +
        "*Condensing Levels:*\n" +
        "• 🟢 *Light (30% reduction)* - Keeps examples and detailed explanations\n" +
        "• 🟡 *Medium (50% reduction)* - Removes most examples, keeps core explanations\n" +
        "• 🔴 *Heavy (70% reduction)* - Extracts only core concepts and key points\n\n" +
        "*File Requirements:*\n" +
        "• PDF format only\n" +
        "• Maximum 100MB file size\n" +
        "• Technical books work best\n\n" +
        "*Processing Time:*\n" +
        "• Typically 5-15 minutes depending on book size\n" +
        "• You'll receive real-time progress updates\n\n" +
        "Need support? Contact our team! 🚀",
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      logger.error("Failed to send help message", { error, userId: ctx.from?.id });
    }
  });

  // Condense command
  bot.command("condense", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const userLogger = createLogger({ userId, chatId });

    if (!userId || !chatId) {
      await ctx.reply("❌ Unable to identify user. Please try again.");
      return;
    }

    try {
      // Check for existing active session
      const existingSession = await sessionService.getUserActiveSession(userId);
      if (existingSession && existingSession.state === "processing") {
        await ctx.reply(
          "📝 You already have a book being processed. Please wait for it to complete before starting another one.",
          {
            reply_markup: {
              inline_keyboard: [[
                { text: "❌ Cancel Current Processing", callback_data: "cancel_processing" }
              ]]
            }
          }
        );
        return;
      }

      // Create new session
      await sessionService.createSession(userId, chatId);
      
      await ctx.reply(
        "Let's condense your book! 📖✨\n\n" +
        "First, select how much you want to condense it:\n\n" +
        "🟢 **Light (30%)** - Keeps examples and detailed explanations\n" +
        "🟡 **Medium (50%)** - Removes most examples, keeps core content\n" +
        "🔴 **Heavy (70%)** - Only core concepts and key points",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🟢 Light (30%)", callback_data: "level:light" },
                { text: "🟡 Medium (50%)", callback_data: "level:medium" }
              ],
              [
                { text: "🔴 Heavy (70%)", callback_data: "level:heavy" }
              ],
              [
                { text: "❌ Cancel", callback_data: "cancel" }
              ]
            ]
          }
        }
      );

      userLogger.info("Condense command initiated");
    } catch (error) {
      userLogger.error("Failed to start condense workflow", { error });
      await ctx.reply("❌ Failed to start processing. Please try again later.");
    }
  });

  // Callback query handlers
  bot.callbackQuery(/^level:(.+)$/, async (ctx) => {
    const level = ctx.match![1] as "light" | "medium" | "heavy";
    const userId = ctx.from?.id;
    const userLogger = createLogger({ userId, level });

    if (!userId) {
      await ctx.answerCallbackQuery("❌ Unable to identify user");
      return;
    }

    try {
      await sessionService.setCondensingLevel(userId, level);
      
      const levelDescriptions = {
        light: "🟢 Light condensing (30% reduction)",
        medium: "🟡 Medium condensing (50% reduction)", 
        heavy: "🔴 Heavy condensing (70% reduction)"
      };

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `Great! You selected ${levelDescriptions[level]}.\n\n` +
        "📎 **Now please upload your PDF book:**\n\n" +
        "📋 *Requirements:*\n" +
        "• PDF format only\n" +
        "• Maximum 100MB\n" +
        "• Technical books work best\n\n" +
        "📤 Just drag and drop or click the attachment button to upload!",
        { 
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { text: "❌ Cancel", callback_data: "cancel" }
            ]]
          }
        }
      );

      userLogger.info("Condensing level selected");
    } catch (error) {
      userLogger.error("Failed to set condensing level", { error });
      await ctx.answerCallbackQuery("❌ Failed to save selection. Please try again.");
    }
  });

  // Cancel callback
  bot.callbackQuery("cancel", async (ctx) => {
    const userId = ctx.from?.id;
    
    if (userId) {
      await sessionService.deleteSession(userId);
    }

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "❌ Cancelled. Use /condense to start over anytime!"
    );
    
    logger.info("User cancelled workflow", { userId });
  });

  // Cancel processing callback
  bot.callbackQuery("cancel_processing", async (ctx) => {
    const userId = ctx.from?.id;
    
    if (userId) {
      await sessionService.deleteSession(userId);
      // TODO: Cancel any ongoing book processing
    }

    await ctx.answerCallbackQuery("Processing cancelled");
    await ctx.editMessageText(
      "❌ Processing cancelled. Use /condense to start a new book!"
    );
    
    logger.info("User cancelled processing", { userId });
  });

  // Document handler (PDF upload)
  bot.on("message:document", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const document = ctx.message.document;
    const userLogger = createLogger({ userId, chatId });

    if (!userId || !chatId) {
      await ctx.reply("❌ Unable to identify user. Please try again.");
      return;
    }

    // Check file type
    if (!document.mime_type?.includes("pdf")) {
      await ctx.reply(
        "📄 Please upload a PDF file only.\n\n" +
        "Other formats are not supported yet."
      );
      return;
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (document.file_size && document.file_size > maxSize) {
      await ctx.reply(
        "📦 File too large! Please upload a PDF smaller than 100MB.\n\n" +
        `Your file: ${Math.round(document.file_size / (1024 * 1024))}MB`
      );
      return;
    }

    try {
      // Check for active session
      const session = await sessionService.getUserActiveSession(userId);
      if (!session || !session.condensingLevel || session.state !== "awaiting_pdf") {
        await ctx.reply(
          "❌ No active session found. Please use /condense to start first."
        );
        return;
      }

      // Send initial progress message
      const progressMessage = await ctx.reply("📤 Uploading PDF...");

      // Get file and download it
      const file = await ctx.getFile();
      const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
      const arrayBuffer = await response.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);

      // Create book record
      const book = await bookService.createBook({
        userId: userId.toString(),
        chatId: chatId.toString(),
        messageId: progressMessage.message_id.toString(),
        condensingLevel: session.condensingLevel,
        fileName: document.file_name || "book.pdf",
        fileSize: document.file_size || pdfBuffer.length,
      });

      // Update session
      await sessionService.setProcessingState(userId, book.bookId);

      // Upload PDF and start processing
      await bookService.uploadOriginalPdf(book.bookId, pdfBuffer);
      await bookService.startProcessing(book.bookId);

      await ctx.api.editMessageText(
        chatId,
        progressMessage.message_id,
        "✅ Upload complete! Processing started...\n\n" +
        "📊 Progress: 10% - Initial processing...\n\n" +
        "⏱️ This usually takes 5-15 minutes. You'll get real-time updates!"
      );

      userLogger.info("PDF uploaded and processing started", {
        bookId: book.bookId,
        fileName: document.file_name,
        fileSize: document.file_size
      });

    } catch (error) {
      userLogger.error("Failed to process PDF upload", { error });
      await ctx.reply(
        "❌ Failed to process your PDF. This could be due to:\n\n" +
        "• Corrupted or invalid PDF file\n" +
        "• Temporary server error\n" +
        "• Network issues\n\n" +
        "Please try again with a different file or contact support if the issue persists."
      );
    }
  });

  // Handle non-PDF files
  bot.on("message:photo", async (ctx) => {
    await ctx.reply("📸 Please upload a PDF file, not an image.");
  });

  bot.on("message:video", async (ctx) => {
    await ctx.reply("🎥 Please upload a PDF file, not a video.");
  });

  // Default handler for unrecognized messages
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.toLowerCase();
    
    if (text.includes("help") || text.includes("?")) {
      await ctx.reply("Use /help to see available commands.");
    } else if (text.includes("start") || text.includes("begin")) {
      await ctx.reply("Use /condense to start processing a book.");
    } else {
      await ctx.reply(
        "I didn't understand that. Here's what I can do:\n\n" +
        "📖 /condense - Start condensing a PDF book\n" +
        "❓ /help - Get detailed help\n\n" +
        "Just send me one of these commands to get started!"
      );
    }
  });

  return bot;
}