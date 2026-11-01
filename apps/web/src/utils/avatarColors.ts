export const avatarColorList = [
  'bg-indigo-100 text-indigo-700',
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
];

/**
 * Deterministically returns a consistent pastel color class for an avatar
 * based on name, ID, or index.
 */
export const getAvatarColor = (identifier?: string | number | null, index?: number): string => {
  if (typeof index === 'number' && index >= 0) {
    return avatarColorList[index % avatarColorList.length];
  }
  if (!identifier) return avatarColorList[0];
  const str = String(identifier).trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % avatarColorList.length;
  return avatarColorList[colorIndex];
};
