import { describe, it, expect } from 'vitest';
import { generateTokens, verifyRefreshToken } from '../middlewares/auth.js';
import jwt from 'jsonwebtoken';

describe('Option 3: Remember Me Authentication Token Lifecycle Tests', () => {
  const mockUser: any = {
    id: 101,
    email: 'test@example.com',
    role: 'EMPLOYEE',
    companyId: 1,
  };

  it('generates 12-hour refresh token when rememberMe is false', () => {
    const { accessToken, refreshToken } = generateTokens(mockUser, false);
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    const decoded = jwt.decode(refreshToken) as any;
    expect(decoded.rememberMe).toBe(false);

    // Expiry difference should be approximately 12 hours (43200 seconds)
    const durationSeconds = decoded.exp - decoded.iat;
    expect(durationSeconds).toBe(12 * 60 * 60);

    const verified = verifyRefreshToken(refreshToken);
    expect(verified.userId).toBe(101);
    expect(verified.rememberMe).toBe(false);
  });

  it('generates 7-day refresh token when rememberMe is true', () => {
    const { accessToken, refreshToken } = generateTokens(mockUser, true);
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    const decoded = jwt.decode(refreshToken) as any;
    expect(decoded.rememberMe).toBe(true);

    // Expiry difference should be approximately 7 days (604800 seconds)
    const durationSeconds = decoded.exp - decoded.iat;
    expect(durationSeconds).toBe(7 * 24 * 60 * 60);

    const verified = verifyRefreshToken(refreshToken);
    expect(verified.userId).toBe(101);
    expect(verified.rememberMe).toBe(true);
  });
});
