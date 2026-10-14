import { Company, Role, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'passwordHash'> & {
        isManager?: boolean;
      };
      company?: Company & {
        package?: {
          id: number;
          name: string;
          enabledFeatures: any;
          employeeLimit: number;
        } | null;
      };
    }
  }
}
export {};
