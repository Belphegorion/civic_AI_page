import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

let socket = null;
export function connectSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket'] });
  }
  return socket;
}
export function getSocket() { return socket; }
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
