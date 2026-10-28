import { io, Socket } from 'socket.io-client';
import { apiBase, TOKEN_KEY } from './api';

/** Opens an authenticated Socket.io connection and joins the room for one farm. */
export function connectFarm(farmId: string): Socket {
  const socket = io(apiBase || undefined, { auth: { token: localStorage.getItem(TOKEN_KEY) }, transports: ['websocket', 'polling'] });
  socket.on('connect', () => socket.emit('subscribe', farmId));
  return socket;
}
