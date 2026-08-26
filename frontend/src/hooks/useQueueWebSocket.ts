import { useEffect, useRef, useState } from "react";

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
  const isMountedRef = useRef(true);

  // Keep latest onEvent callback in a ref to avoid recreating connection on every render
  const onEventRef = useRef(options.onEvent);
  onEventRef.current = options.onEvent;

  const channel = options.channel || "public";
  const token = options.token || null;

  useEffect(() => {
    isMountedRef.current = true;

    if (!queueId) {
      setIsConnected(false);
      return;
    }

    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;

      const baseWs = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/v1";
      let url = `${baseWs}/queues/${queueId}?channel=${channel}`;
      if (token) {
        url += `&token=${encodeURIComponent(token)}`;
      }

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCleanedUp) {
            ws.close();
            return;
          }
          setIsConnected(true);

          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          // Heartbeat ping every 30s
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          if (isCleanedUp) return;
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "pong") return;

            setLastEvent(payload);
            if (onEventRef.current) {
              onEventRef.current(payload);
            }
          } catch {
            // Ignored malformed payload
          }
        };

        ws.onclose = () => {
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          if (isCleanedUp) return;

          setIsConnected((prev) => (prev ? false : prev));

          // Exponential / delayed reconnect attempt
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isCleanedUp && isMountedRef.current) {
              connect();
            }
          }, 3000);
        };

        ws.onerror = () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch {
        if (!isCleanedUp) {
          setIsConnected((prev) => (prev ? false : prev));
        }
      }
    };

    connect();

    return () => {
      isCleanedUp = true;
      isMountedRef.current = false;

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [queueId, channel, token]);

  return { isConnected, lastEvent };
}
