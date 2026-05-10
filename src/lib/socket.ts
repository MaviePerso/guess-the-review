import { io } from "socket.io-client";

// En production, remplacer par l'URL du serveur Render/Railway
const URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export const socket = io(URL, {
  autoConnect: false,
  transports: ["websocket"] // Force websocket to avoid XHR poll error
});
