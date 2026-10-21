import React from 'react';
import {
  IconFlame,
  IconTree,
  IconConfetti,
  IconMoon,
  IconPalette,
  IconFlag,
  IconSun,
  IconCross,
  IconFlower,
  IconSparkles,
  IconBriefcase,
  IconCalendarEvent,
} from '@tabler/icons-react';

export interface HolidayIconStyle {
  Icon: React.ComponentType<{ className?: string; size?: number | string }>;
  className: string;
}

/**
 * Returns a festival-specific icon and color theme based on holiday title.
 * Falls back to a clean holiday calendar icon (IconCalendarEvent) for general holidays.
 */
export function getHolidayIcon(title: string): HolidayIconStyle {
  const lower = (title || '').toLowerCase().trim();

  // 1. Diwali / Deepavali / Dhanteras / Karthigai
  if (
    lower.includes('diwali') ||
    lower.includes('deepavali') ||
    lower.includes('dhanteras') ||
    lower.includes('karwa') ||
    lower.includes('karthigai') ||
    lower.includes('naraka')
  ) {
    return {
      Icon: IconFlame,
      className: 'bg-amber-50 text-amber-600 border border-amber-200/70',
    };
  }

  // 2. Christmas / Xmas / Boxing Day
  if (
    lower.includes('christmas') ||
    lower.includes('xmas') ||
    lower.includes('x-mas') ||
    lower.includes('boxing day')
  ) {
    return {
      Icon: IconTree,
      className: 'bg-emerald-50 text-emerald-600 border border-emerald-200/70',
    };
  }

  // 3. New Year
  if (lower.includes('new year')) {
    return {
      Icon: IconConfetti,
      className: 'bg-purple-50 text-purple-600 border border-purple-200/70',
    };
  }

  // 4. Islamic Festivals: Eid, Ramadan, Bakrid, Muharram, Milad
  if (
    lower.includes('eid') ||
    lower.includes('ramadan') ||
    lower.includes('ramzan') ||
    lower.includes('muharram') ||
    lower.includes('bakrid') ||
    lower.includes('milad')
  ) {
    return {
      Icon: IconMoon,
      className: 'bg-teal-50 text-teal-600 border border-teal-200/70',
    };
  }

  // 5. Holi / Rangpanchami / Dhuleti
  if (
    lower.includes('holi') ||
    lower.includes('dhuleti') ||
    lower.includes('rangpanchami') ||
    lower.includes('dhulandi')
  ) {
    return {
      Icon: IconPalette,
      className: 'bg-pink-50 text-pink-600 border border-pink-200/70',
    };
  }

  // 6. National / Patriotic Holidays: Independence, Republic, Constitution
  if (
    lower.includes('republic') ||
    lower.includes('independence') ||
    lower.includes('national') ||
    lower.includes('constitution')
  ) {
    return {
      Icon: IconFlag,
      className: 'bg-orange-50 text-orange-600 border border-orange-200/70',
    };
  }

  // 7. Sun / Harvest Festivals: Makar Sankranti, Pongal, Lohri, Baisakhi, Ugadi, Gudi Padwa, Chhath, Vishu, Onam
  if (
    lower.includes('sankranti') ||
    lower.includes('pongal') ||
    lower.includes('lohri') ||
    lower.includes('baisakhi') ||
    lower.includes('ugadi') ||
    lower.includes('gudi padwa') ||
    lower.includes('chhath') ||
    lower.includes('vishu') ||
    lower.includes('onam')
  ) {
    return {
      Icon: IconSun,
      className: 'bg-yellow-50 text-yellow-700 border border-yellow-200/70',
    };
  }

  // 8. Christian Holy Days: Good Friday, Easter, Ascension
  if (
    lower.includes('friday') ||
    lower.includes('easter') ||
    lower.includes('ascension')
  ) {
    return {
      Icon: IconCross,
      className: 'bg-violet-50 text-violet-600 border border-violet-200/70',
    };
  }

  // 9. Memorial / Peace / Spiritual Leaders: Gandhi, Ambedkar, Buddha, Mahavir, Guru Nanak
  if (
    lower.includes('gandhi') ||
    lower.includes('ambedkar') ||
    lower.includes('buddha') ||
    lower.includes('mahavir') ||
    lower.includes('guru nanak') ||
    lower.includes('gurpurab')
  ) {
    return {
      Icon: IconFlower,
      className: 'bg-lime-50 text-lime-700 border border-lime-200/70',
    };
  }

  // 10. Navratri, Dussehra, Durga Puja, Ganesh Chaturthi, Janmashtami, Maha Shivratri, Raksha Bandhan
  if (
    lower.includes('navratri') ||
    lower.includes('durga') ||
    lower.includes('dussehra') ||
    lower.includes('dasara') ||
    lower.includes('vijayadashami') ||
    lower.includes('ganesh') ||
    lower.includes('vinayaka') ||
    lower.includes('janmashtami') ||
    lower.includes('krishna') ||
    lower.includes('shivratri') ||
    lower.includes('raksha') ||
    lower.includes('rakhi')
  ) {
    return {
      Icon: IconSparkles,
      className: 'bg-rose-50 text-rose-600 border border-rose-200/70',
    };
  }

  // 11. Labor / May Day
  if (
    lower.includes('labor') ||
    lower.includes('labour') ||
    lower.includes('may day')
  ) {
    return {
      Icon: IconBriefcase,
      className: 'bg-blue-50 text-blue-600 border border-blue-200/70',
    };
  }

  // 12. Default Common Holiday Icon
  return {
    Icon: IconCalendarEvent,
    className: 'bg-indigo-50 text-[#5E4BE2] border border-indigo-200/70',
  };
}
