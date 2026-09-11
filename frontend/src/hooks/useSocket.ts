import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../api/client";
import { getAccessToken } from "../context/AuthContext";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef;
}
