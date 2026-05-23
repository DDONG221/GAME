import { Peer, DataConnection } from 'peerjs';
import { GameMessage } from './types';

export class NetworkManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private onMessageCallback: ((senderId: string, message: GameMessage) => void) | null = null;
  private onDisconnectCallback: ((id: string) => void) | null = null;

  constructor() {}

  initialize(onReady: (id: string) => void, onError: (err: any) => void) {
    if (this.peer) {
      this.disconnect();
    }

    this.peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    this.peer.on('open', (id) => {
      onReady(id);
    });

    this.peer.on('connection', (conn) => {
      this.setupConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.error('Peer connection error:', err);
      onError(err);
    });
  }

  connectToHost(hostId: string, onConnect: () => void, onFailure: (err: any) => void) {
    if (!this.peer) {
      onFailure(new Error('Peer가 초기화되지 않았습니다.'));
      return;
    }
    const conn = this.peer.connect(hostId);
    
    conn.on('open', () => {
      this.setupConnection(conn);
      onConnect();
    });

    conn.on('error', (err) => {
      onFailure(err);
    });
  }

  private setupConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on('data', (data) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(conn.peer, data as GameMessage);
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback(conn.peer);
      }
    });

    conn.on('error', (err) => {
      console.error('Connection error with peer:', conn.peer, err);
      this.connections.delete(conn.peer);
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback(conn.peer);
      }
    });
  }

  onMessage(callback: (senderId: string, message: GameMessage) => void) {
    this.onMessageCallback = callback;
  }

  onDisconnect(callback: (id: string) => void) {
    this.onDisconnectCallback = callback;
  }

  send(targetId: string, message: GameMessage) {
    const conn = this.connections.get(targetId);
    if (conn && conn.open) {
      conn.send(message);
    }
  }

  broadcast(message: GameMessage) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  disconnect() {
    this.connections.forEach(conn => {
      try {
        conn.close();
      } catch (e) {
        console.error(e);
      }
    });
    this.connections.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {
        console.error(e);
      }
      this.peer = null;
    }
  }

  getMyId(): string {
    return this.peer ? this.peer.id : '';
  }
}

export const network = new NetworkManager();
