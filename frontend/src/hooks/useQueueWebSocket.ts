import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketOptions {
  channel?: "public" | "staff";
  token?: string | null;
  onEvent?: (event: any) => void;
}

export function useQueueWebSocket(queueId: string | null, options: WebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const channel = options.channel || "public";
  const token = options.token;
  const onEvent = options.onEvent;

  const connect = useCallback(() => {
    if (!queueId) return;

    const baseWs = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/v1";
    let url = `${baseWs}/queues/${queueId}?channel=${channel}`;
    if (token) {
      url += `&token=${encodeURIComponent(token)}`;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Start ping heartbeat every 30 seconds
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "pong") return;

          setLastEvent(payload);
          if (onEvent) {
            onEvent(payload);
          }
        } catch {
          // Ignored
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Exponential reconnect attempt
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setIsConnected(false);
    }
  }, [queueId, channel, token, onEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [connect]);

  return { isConnected, lastEvent };
}
