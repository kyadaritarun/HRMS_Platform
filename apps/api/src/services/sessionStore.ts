/**
 * Pillar 3: Multi-Turn Conversation Memory & Session Store
 * Manages persistent conversation threads, message histories, and sliding context windows.
 * Zero-API-key local persistence with multi-tenant company and user isolation.
 */

import fs from 'fs';
import path from 'path';

export interface StoredMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  action?: any;
  widget?: any;
  citations?: string[];
  timestamp: string;
  createdAt: number;
}

export interface SessionContext {
  lastTopic?: string;
  pendingAction?: any;
  mentionedLeaveTypes?: string[];
  mentionedDates?: { startDate: string; endDate: string; days: number };
  lastPolicyTitle?: string;
}

export interface AssistantSession {
  id: string;
  companyId: number;
  userId: number;
  title: string;
  messages: StoredMessage[];
  context: SessionContext;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessageSnippet: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = process.cwd().endsWith('api')
  ? path.resolve(process.cwd(), 'data')
  : path.resolve(process.cwd(), 'apps', 'api', 'data');
const DATA_FILE = path.join(DATA_DIR, 'assistant_sessions.json');

// In-memory cache for low-latency operations
const sessionsCache = new Map<string, AssistantSession>();
let isLoaded = false;

function ensureLoaded() {
  if (isLoaded) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const list: AssistantSession[] = JSON.parse(raw);
      list.forEach((s) => sessionsCache.set(s.id, s));
    }
  } catch (err) {
    console.error('Failed to load assistant sessions from disk:', err);
  } finally {
    isLoaded = true;
  }
}

function persistToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(sessionsCache.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist assistant sessions to disk:', err);
  }
}

/**
 * Lists all active conversation sessions for the user within their company.
 */
export function listSessions(userId: number, companyId: number): SessionSummary[] {
  ensureLoaded();
  const userSessions: AssistantSession[] = [];
  sessionsCache.forEach((s) => {
    if (s.userId === userId && s.companyId === companyId) {
      userSessions.push(s);
    }
  });

  // Sort descending by updatedAt
  userSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return userSessions.map((s) => {
    const lastMsg = s.messages[s.messages.length - 1];
    return {
      id: s.id,
      title: s.title,
      messageCount: s.messages.length,
      lastMessageSnippet: lastMsg ? lastMsg.text.slice(0, 70) : 'Empty chat',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  });
}

/**
 * Retrieves a single session ensuring strict multi-tenant ownership.
 */
export function getSession(sessionId: string, userId: number, companyId: number): AssistantSession | null {
  ensureLoaded();
  const session = sessionsCache.get(sessionId);
  if (!session) return null;
  if (session.userId !== userId || session.companyId !== companyId) {
    return null;
  }
  return session;
}

/**
 * Creates a new conversation thread.
 */
export function createSession(userId: number, companyId: number, initialTitle?: string): AssistantSession {
  ensureLoaded();
  const id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const newSession: AssistantSession = {
    id,
    companyId,
    userId,
    title: initialTitle || 'New Conversation',
    messages: [
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Hello! I am your Uptrix AI HR Assistant. I have indexed your company's official policies, leave balances, and attendance rules. Ask me anything about HR policies, quotas, or benefits!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
      },
    ],
    context: {},
    createdAt: now,
    updatedAt: now,
  };

  sessionsCache.set(id, newSession);
  persistToDisk();
  return newSession;
}

/**
 * Appends a message to a session and updates the conversation context.
 */
export function appendMessage(
  sessionId: string,
  userId: number,
  companyId: number,
  message: StoredMessage,
  contextUpdate?: Partial<SessionContext>
): AssistantSession | null {
  ensureLoaded();
  let session = getSession(sessionId, userId, companyId);
  if (!session) {
    session = createSession(userId, companyId);
  }

  session.messages.push(message);
  session.updatedAt = new Date().toISOString();

  if (contextUpdate) {
    session.context = {
      ...session.context,
      ...contextUpdate,
    };
  }

  // Auto-generate title from first user query if still default
  if (message.sender === 'user' && (session.title === 'New Conversation' || session.title === 'New Chat')) {
    let clean = message.text.replace(/^(apply|please|can you|how do i|what is|tell me)\s+/i, '');
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    session.title = clean.length > 32 ? `${clean.slice(0, 32)}...` : clean;
  }

  sessionsCache.set(session.id, session);
  persistToDisk();
  return session;
}

/**
 * Deletes a conversation session thread.
 */
export function deleteSession(sessionId: string, userId: number, companyId: number): boolean {
  ensureLoaded();
  const session = getSession(sessionId, userId, companyId);
  if (!session) return false;
  const deleted = sessionsCache.delete(sessionId);
  if (deleted) {
    persistToDisk();
  }
  return deleted;
}

/**
 * Resets cache for automated unit testing.
 */
export function _resetStoreForTesting() {
  sessionsCache.clear();
  isLoaded = true;
}

