/**
 * React hook for communicating with the Figma Bridge WebSocket server.
 * Used by Discover and Components pages to talk to the plugin in real time.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const BRIDGE_URL = 'ws://localhost:9001';
let idCounter = 0;

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface PendingRequest {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export function useBridge() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(BRIDGE_URL);

    ws.onopen = () => {
      setStatus('connected');
      wsRef.current = ws;
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
      // Reject any pending requests
      pendingRef.current.forEach((p) => p.reject(new Error('Connection closed')));
      pendingRef.current.clear();
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'response' && msg.id) {
          const pending = pendingRef.current.get(msg.id);
          if (pending) {
            clearTimeout(pending.timer);
            pendingRef.current.delete(msg.id);
            if (msg.success) {
              pending.resolve(msg.data);
            } else {
              pending.reject(new Error(msg.error || 'Unknown error'));
            }
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setStatus('disconnected');
    }
  }, []);

  const send = useCallback(
    (command: string, payload: Record<string, unknown> = {}): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          reject(new Error('Not connected to bridge'));
          return;
        }

        const id = `ui-${++idCounter}-${Date.now()}`;
        const timer = setTimeout(() => {
          pendingRef.current.delete(id);
          reject(new Error('Request timed out (30s)'));
        }, 30000);

        pendingRef.current.set(id, { resolve, reject, timer });
        ws.send(JSON.stringify({ id, type: 'request', command, payload }));
      });
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      pendingRef.current.forEach((p) => {
        clearTimeout(p.timer);
        p.reject(new Error('Component unmounted'));
      });
      pendingRef.current.clear();
    };
  }, []);

  return { status, connect, disconnect, send };
}
