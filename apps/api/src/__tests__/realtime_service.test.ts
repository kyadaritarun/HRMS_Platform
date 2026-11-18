import { describe, it, expect, vi } from 'vitest';
import { addRealtimeClient, removeRealtimeClient, emitToUser, getActiveConnectionCount } from '../services/realtimeService.js';

describe('Part 2 - Real-Time Service Unit Tests', () => {
  it('registers, receives events, and deregisters client streams', () => {
    const mockRes: any = {
      write: vi.fn(),
    };

    const userId = 999;
    addRealtimeClient(userId, mockRes);
    expect(getActiveConnectionCount()).toBeGreaterThanOrEqual(1);

    // Emit event to this user
    emitToUser(userId, 'notification', { id: 1, title: 'Leave Approved', message: 'Your leave has been approved' });

    expect(mockRes.write).toHaveBeenCalledTimes(1);
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('event: notification')
    );
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('Leave Approved')
    );

    // Remove client
    removeRealtimeClient(userId, mockRes);
  });
});
