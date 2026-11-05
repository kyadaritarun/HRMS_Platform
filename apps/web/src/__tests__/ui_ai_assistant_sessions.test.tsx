import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AssistantPage } from '../pages/assistant/AssistantPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Pillar 3: AI Assistant Conversation Sessions & Multi-Turn Memory UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders session threads sidebar and fetches user conversation history', async () => {
    (api.get as any).mockResolvedValueOnce({
      data: {
        sessions: [
          {
            id: 'sess_1',
            title: 'Sick Leave Discussion',
            messageCount: 3,
            lastMessageSnippet: 'I have updated your request to 2 days',
            updatedAt: '2026-11-05T10:00:00Z',
          },
          {
            id: 'sess_2',
            title: 'Travel Policy Clarification',
            messageCount: 2,
            lastMessageSnippet: 'According to Travel & Expense policy',
            updatedAt: '2026-11-04T15:30:00Z',
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    expect(screen.getByText('New Conversation')).toBeInTheDocument();
    expect(screen.getByText('Recent Chats')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Sick Leave Discussion')).toBeInTheDocument();
      expect(screen.getByText('Travel Policy Clarification')).toBeInTheDocument();
    });
  });

  it('2. Selecting a session loads its messages and switches active conversation', async () => {
    (api.get as any)
      .mockResolvedValueOnce({
        data: {
          sessions: [
            {
              id: 'sess_1',
              title: 'Sick Leave Discussion',
              messageCount: 2,
              lastMessageSnippet: 'Sick leave prepared',
              updatedAt: '2026-11-05T10:00:00Z',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          session: {
            id: 'sess_1',
            title: 'Sick Leave Discussion',
            messages: [
              {
                id: 'msg_1',
                sender: 'user',
                text: 'Apply sick leave for tomorrow',
                timestamp: '10:00 AM',
              },
              {
                id: 'msg_2',
                sender: 'assistant',
                text: 'I have prepared your Sick Leave request for 1 Day.',
                timestamp: '10:01 AM',
              },
            ],
          },
        },
      });

    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    const sessionItem = await screen.findByText('Sick Leave Discussion');
    fireEvent.click(sessionItem);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/assistant/sessions/sess_1');
      expect(screen.getByText('Apply sick leave for tomorrow')).toBeInTheDocument();
      expect(screen.getByText('I have prepared your Sick Leave request for 1 Day.')).toBeInTheDocument();
    });
  });

  it('3. Sending a follow-up message sends sessionId for multi-turn context carryover', async () => {
    (api.get as any).mockResolvedValueOnce({
      data: {
        sessions: [
          {
            id: 'sess_1',
            title: 'Sick Leave Discussion',
            messageCount: 2,
            lastMessageSnippet: 'Sick leave prepared',
            updatedAt: '2026-11-05T10:00:00Z',
          },
        ],
      },
    }).mockResolvedValueOnce({
      data: {
        session: {
          id: 'sess_1',
          title: 'Sick Leave Discussion',
          messages: [
            { id: 'm1', sender: 'assistant', text: 'How can I help you today?', timestamp: '10:00 AM' },
          ],
        },
      },
    });

    (api.post as any).mockResolvedValueOnce({
      data: {
        reply: 'I have updated your request to 2 Days.',
        sessionId: 'sess_1',
      },
    });

    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    const sessionItem = await screen.findByText('Sick Leave Discussion');
    fireEvent.click(sessionItem);

    await screen.findByText('How can I help you today?');

    const input = screen.getByPlaceholderText(/Ask about leaves/i);
    fireEvent.change(input, { target: { value: 'make it 2 days instead' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/assistant/chat', {
        message: 'make it 2 days instead',
        sessionId: 'sess_1',
      });
      expect(screen.getByText('I have updated your request to 2 Days.')).toBeInTheDocument();
    });
  });

  it('4. Clicking "New Conversation" clears chat and resets sessionId', async () => {
    (api.get as any).mockResolvedValueOnce({
      data: { sessions: [] },
    });

    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    const newChatBtn = screen.getByRole('button', { name: /New Conversation/i });
    fireEvent.click(newChatBtn);

    expect(screen.getByText(/I have indexed your company's official policies/i)).toBeInTheDocument();
  });
});

