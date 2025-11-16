import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(process.env.VITE_API_URL || 'http://localhost:3010', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket.io connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket.io disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('🔌 Socket.io error:', error);
    });

    // Re-register listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.on(event, callback as (...args: any[]) => void);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join user-specific room for progress updates
  joinUserRoom(userId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-user', userId);
    }
  }

  // Listen for book progress updates
  onBookProgress(callback: (data: {
    bookId: string;
    userId: string;
    progress: number;
    status: string;
    message: string;
  }) => void) {
    this.addListener('book-progress', callback);
  }

  // Listen for book completion
  onBookCompleted(callback: (data: {
    bookId: string;
    userId: string;
    status: string;
    downloadUrl?: string;
  }) => void) {
    this.addListener('book-completed', callback);
  }

  // Listen for book processing errors
  onBookError(callback: (data: {
    bookId: string;
    userId: string;
    error: string;
  }) => void) {
    this.addListener('book-error', callback);
  }

  private addListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    // Add listener to socket if connected
    if (this.socket?.connected) {
      this.socket.on(event, callback as (...args: any[]) => void);
    }
  }

  removeListener(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback as (...args: any[]) => void);
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    } else {
      this.listeners.clear();
      if (this.socket) {
        this.socket.removeAllListeners();
      }
    }
  }
}

export const socketService = new SocketService();