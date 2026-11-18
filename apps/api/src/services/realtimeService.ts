import { Response } from 'express';
import redis, { isRedisReady } from '../lib/redis.js';

interface ClientEntry {
  userId: number;
  companyId?: number;
  res: Response;
}

const REALTIME_CHANNEL = 'hrms:realtime:events';

// Map of userId -> Set of active Express Response streams
const userClients = new Map<number, Set<Response>>();

// Dedicated Redis subscriber client for clustering
let subClient: any = null;

if (redis) {
  try {
    subClient = redis.duplicate();
    subClient.on('error', () => {
      // Graceful fallback when Redis is offline in local dev/tests
    });

    subClient.subscribe(REALTIME_CHANNEL, (err: any) => {
      if (err) {
        // Safe warning on local dev without Redis
      }
    });

    subClient.on('message', (_channel: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        dispatchLocal(payload.userId, payload.event, payload.data);
      } catch {
        // ignore parse errors
      }
    });
  } catch {
    subClient = null;
  }
}

function dispatchLocal(userId: number, event: string, data: any) {
  const clientSet = userClients.get(userId);
  if (!clientSet || clientSet.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clientSet) {
    try {
      res.write(payload);
    } catch {
      clientSet.delete(res);
    }
  }
}

/**
 * Register a client Response stream for real-time SSE updates.
 */
export function addRealtimeClient(userId: number, res: Response): void {
  let clientSet = userClients.get(userId);
  if (!clientSet) {
    clientSet = new Set<Response>();
    userClients.set(userId, clientSet);
  }
  clientSet.add(res);
}

/**
 * Deregister a client Response stream on disconnect.
 */
export function removeRealtimeClient(userId: number, res: Response): void {
  const clientSet = userClients.get(userId);
  if (clientSet) {
    clientSet.delete(res);
    if (clientSet.size === 0) {
      userClients.delete(userId);
    }
  }
}

/**
 * Emit an event to a specific user across all their open browser tabs/devices.
 * Dispatches locally and broadcasts via Redis Pub/Sub if clustering is active.
 */
export function emitToUser(userId: number, event: string, data: any): void {
  // Always dispatch locally
  dispatchLocal(userId, event, data);

  // Broadcast to other cluster nodes if Redis is active
  if (isRedisReady() && redis) {
    try {
      redis.publish(
        REALTIME_CHANNEL,
        JSON.stringify({ userId, event, data })
      ).catch(() => {});
    } catch {
      // safe ignore
    }
  }
}

/**
 * Count active connected users/streams.
 */
export function getActiveConnectionCount(): number {
  let count = 0;
  for (const set of userClients.values()) {
    count += set.size;
  }
  return count;
}
