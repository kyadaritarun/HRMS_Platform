import prisma from '../lib/prisma.js';

export interface HelplineConfig {
  emergencyNumber: string;
  emergencyLabel: string;
  emergencySubtext: string;
  hrPhone: string;
  hrTollFree: string;
  hrEmail: string;
  itEmail: string;
  itExtension: string;
  supportHours: string;
  supportDays: string;
  workplaceAddress: string;
  announcement?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const emptyHelplineConfig: HelplineConfig = {
  emergencyNumber: '',
  emergencyLabel: '',
  emergencySubtext: '',
  hrPhone: '',
  hrTollFree: '',
  hrEmail: '',
  itEmail: '',
  itExtension: '',
  supportHours: '',
  supportDays: '',
  workplaceAddress: '',
  announcement: '',
};

/**
 * Fetch global helpline configuration directly from PostgreSQL database.
 * Supports both Prisma ORM model (prisma.globalHelpline) and SQL query using the active connection schema.
 * No hardcoded database or schema names.
 */
export const getHelplineConfig = async (): Promise<HelplineConfig> => {
  try {
    // 1. Try Prisma Client ORM if generated
    if ((prisma as any).globalHelpline?.findUnique) {
      const r = await (prisma as any).globalHelpline.findUnique({
        where: { key: 'primary' },
      });
      if (r) {
        return {
          emergencyNumber: r.emergencyNumber || '',
          emergencyLabel: r.emergencyLabel || '',
          emergencySubtext: r.emergencySubtext || '',
          hrPhone: r.hrPhone || '',
          hrTollFree: r.hrTollFree || '',
          hrEmail: r.hrEmail || '',
          itEmail: r.itEmail || '',
          itExtension: r.itExtension || '',
          supportHours: r.supportHours || '',
          supportDays: r.supportDays || '',
          workplaceAddress: r.workplaceAddress || '',
          announcement: r.announcement || '',
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
          updatedBy: r.updatedBy || '',
        };
      }
    }

    // 2. Direct database query using connection's search_path
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "GlobalHelpline" WHERE key = 'primary' LIMIT 1;`
    );

    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        emergencyNumber: r.emergencyNumber || '',
        emergencyLabel: r.emergencyLabel || '',
        emergencySubtext: r.emergencySubtext || '',
        hrPhone: r.hrPhone || '',
        hrTollFree: r.hrTollFree || '',
        hrEmail: r.hrEmail || '',
        itEmail: r.itEmail || '',
        itExtension: r.itExtension || '',
        supportHours: r.supportHours || '',
        supportDays: r.supportDays || '',
        workplaceAddress: r.workplaceAddress || '',
        announcement: r.announcement || '',
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
        updatedBy: r.updatedBy || '',
      };
    }
  } catch (error) {
    console.error('Error querying GlobalHelpline from database:', error);
  }

  return emptyHelplineConfig;
};

/**
 * Save global helpline configuration directly to PostgreSQL database.
 * No hardcoded schema name.
 */
export const updateHelplineConfig = async (
  newConfig: Partial<HelplineConfig>,
  updatedBy?: string
): Promise<HelplineConfig> => {
  const current = await getHelplineConfig();

  const emergencyNumber = (newConfig.emergencyNumber !== undefined ? newConfig.emergencyNumber : current.emergencyNumber) || '';
  const emergencyLabel = (newConfig.emergencyLabel !== undefined ? newConfig.emergencyLabel : current.emergencyLabel) || '';
  const emergencySubtext = (newConfig.emergencySubtext !== undefined ? newConfig.emergencySubtext : current.emergencySubtext) || '';
  const hrPhone = (newConfig.hrPhone !== undefined ? newConfig.hrPhone : current.hrPhone) || '';
  const hrTollFree = (newConfig.hrTollFree !== undefined ? newConfig.hrTollFree : current.hrTollFree) || '';
  const hrEmail = (newConfig.hrEmail !== undefined ? newConfig.hrEmail : current.hrEmail) || '';
  const itEmail = (newConfig.itEmail !== undefined ? newConfig.itEmail : current.itEmail) || '';
  const itExtension = (newConfig.itExtension !== undefined ? newConfig.itExtension : current.itExtension) || '';
  const supportHours = (newConfig.supportHours !== undefined ? newConfig.supportHours : current.supportHours) || '';
  const supportDays = (newConfig.supportDays !== undefined ? newConfig.supportDays : current.supportDays) || '';
  const workplaceAddress = (newConfig.workplaceAddress !== undefined ? newConfig.workplaceAddress : current.workplaceAddress) || '';
  const announcement = (newConfig.announcement !== undefined ? newConfig.announcement : current.announcement) || '';
  const by = updatedBy || current.updatedBy || '';
  const now = new Date();

  // Try Prisma ORM upsert first if available
  if ((prisma as any).globalHelpline?.upsert) {
    try {
      const saved = await (prisma as any).globalHelpline.upsert({
        where: { key: 'primary' },
        create: {
          key: 'primary',
          emergencyNumber,
          emergencyLabel,
          emergencySubtext,
          hrPhone,
          hrTollFree,
          hrEmail,
          itEmail,
          itExtension,
          supportHours,
          supportDays,
          workplaceAddress,
          announcement,
          updatedBy: by,
        },
        update: {
          emergencyNumber,
          emergencyLabel,
          emergencySubtext,
          hrPhone,
          hrTollFree,
          hrEmail,
          itEmail,
          itExtension,
          supportHours,
          supportDays,
          workplaceAddress,
          announcement,
          updatedBy: by,
          updatedAt: now,
        },
      });

      return {
        emergencyNumber: saved.emergencyNumber || '',
        emergencyLabel: saved.emergencyLabel || '',
        emergencySubtext: saved.emergencySubtext || '',
        hrPhone: saved.hrPhone || '',
        hrTollFree: saved.hrTollFree || '',
        hrEmail: saved.hrEmail || '',
        itEmail: saved.itEmail || '',
        itExtension: saved.itExtension || '',
        supportHours: saved.supportHours || '',
        supportDays: saved.supportDays || '',
        workplaceAddress: saved.workplaceAddress || '',
        announcement: saved.announcement || '',
        updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : now.toISOString(),
        updatedBy: saved.updatedBy || by,
      };
    } catch (e) {
      console.warn('Prisma ORM upsert fallback to SQL:', e);
    }
  }

  // Direct database upsert using active connection schema
  await prisma.$executeRawUnsafe(
    `INSERT INTO "GlobalHelpline" (
      "key", "emergencyNumber", "emergencyLabel", "emergencySubtext",
      "hrPhone", "hrTollFree", "hrEmail", "itEmail", "itExtension",
      "supportHours", "supportDays", "workplaceAddress", "announcement",
      "updatedBy", "createdAt", "updatedAt"
    ) VALUES (
      'primary', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14
    )
    ON CONFLICT ("key") DO UPDATE SET
      "emergencyNumber" = EXCLUDED."emergencyNumber",
      "emergencyLabel" = EXCLUDED."emergencyLabel",
      "emergencySubtext" = EXCLUDED."emergencySubtext",
      "hrPhone" = EXCLUDED."hrPhone",
      "hrTollFree" = EXCLUDED."hrTollFree",
      "hrEmail" = EXCLUDED."hrEmail",
      "itEmail" = EXCLUDED."itEmail",
      "itExtension" = EXCLUDED."itExtension",
      "supportHours" = EXCLUDED."supportHours",
      "supportDays" = EXCLUDED."supportDays",
      "workplaceAddress" = EXCLUDED."workplaceAddress",
      "announcement" = EXCLUDED."announcement",
      "updatedBy" = EXCLUDED."updatedBy",
      "updatedAt" = EXCLUDED."updatedAt";`,
    emergencyNumber,
    emergencyLabel,
    emergencySubtext,
    hrPhone,
    hrTollFree,
    hrEmail,
    itEmail,
    itExtension,
    supportHours,
    supportDays,
    workplaceAddress,
    announcement,
    by,
    now
  );

  return {
    emergencyNumber,
    emergencyLabel,
    emergencySubtext,
    hrPhone,
    hrTollFree,
    hrEmail,
    itEmail,
    itExtension,
    supportHours,
    supportDays,
    workplaceAddress,
    announcement,
    updatedAt: now.toISOString(),
    updatedBy: by,
  };
};
