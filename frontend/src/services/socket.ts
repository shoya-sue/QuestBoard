import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(): void {
    if (!this.socket) {
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
      this.socket = io(socketUrl, {
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onQuestUpdate(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('questUpdate', callback);
    }
  }

  offQuestUpdate(): void {
    if (this.socket) {
      this.socket.off('questUpdate');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();