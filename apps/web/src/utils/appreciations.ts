import {
  IconFlame,
  IconHeartHandshake,
  IconBulb,
  IconSparkles,
  IconTrophy,
} from '@tabler/icons-react';

export interface AppreciationBadgeMeta {
  key: string;
  label: string;
  icon: any;
  color: string;
}

export const APPRECIATION_BADGES: AppreciationBadgeMeta[] = [
  { key: 'ROCKSTAR', label: 'Rockstar Delivery', icon: IconFlame, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { key: 'TEAM_PLAYER', label: 'Ultimate Team Player', icon: IconHeartHandshake, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { key: 'INNOVATOR', label: 'Innovative Thinker', icon: IconBulb, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { key: 'LIFESAVER', label: 'Lifesaver Under Pressure', icon: IconSparkles, color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { key: 'LEADERSHIP', label: 'Inspiring Leadership', icon: IconTrophy, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
];

export const parseAppreciationPayload = (payload: any): Record<string, any> => {
  if (!payload) return {};
  if (typeof payload === 'object') return payload;
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }
  return {};
};

export const getBadgeMeta = (badgeKey?: string, payload?: any): AppreciationBadgeMeta => {
  const p = parseAppreciationPayload(payload);
  const rawKey = (badgeKey || p.badge || 'Rockstar Delivery').trim();
  const found = APPRECIATION_BADGES.find(
    (b) =>
      b.key.toLowerCase() === rawKey.toLowerCase() ||
      b.label.toLowerCase() === rawKey.toLowerCase() ||
      rawKey.toLowerCase().includes(b.key.toLowerCase())
  );
  if (found) return found;
  return {
    key: rawKey,
    label: rawKey,
    icon: IconSparkles,
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  };
};

export const getAppreciationReceiverName = (app: any): string => {
  const r = app.receiver || app.user || app.recipient;
  if (r) {
    const fullName = `${r.firstName || ''} ${r.lastName || ''}`.trim();
    if (fullName) return fullName;
    if (r.name) return r.name;
    if (r.email) return r.email;
  }
  return 'Colleague';
};

export const getAppreciationSenderName = (app: any): string => {
  if (app.sender) {
    const fullName = `${app.sender.firstName || ''} ${app.sender.lastName || ''}`.trim();
    if (fullName) return fullName;
    if (app.sender.name) return app.sender.name;
  }
  const p = parseAppreciationPayload(app.payload);
  if (p.senderName) return p.senderName;
  if (p.sender?.firstName) {
    return `${p.sender.firstName || ''} ${p.sender.lastName || ''}`.trim();
  }
  if (app.title && typeof app.title === 'string' && app.title.toLowerCase().startsWith('kudos from ')) {
    return app.title.replace(/^kudos from\s*/i, '').trim();
  }
  return 'Teammate';
};

export const getAppreciationMessage = (app: any): string => {
  const p = parseAppreciationPayload(app.payload);
  if (p.message && typeof p.message === 'string' && p.message.trim()) {
    return p.message.trim();
  }
  if (app.message && typeof app.message === 'string' && app.message.trim()) {
    return app.message.trim();
  }
  return 'Recognized for outstanding work and valuable team contribution!';
};

export const getAppreciationInitials = (name: string): string => {
  return (
    name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  );
};

export const formatAppreciationDate = (dateString?: string): string => {
  if (!dateString) return 'Recent';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recent';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Check if within same calendar day
    if (now.toDateString() === date.toDateString()) {
      return 'Today';
    }
    return 'Yesterday';
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
};
