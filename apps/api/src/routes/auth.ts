import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { generateTokens, verifyRefreshToken, authMiddleware } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { AppError } from '../middlewares/errorHandler.js';
import { LoginSchema, ChangePasswordSchema, ForgotPasswordSchema, ResetPasswordSchema } from '../schemas/auth.js';
import { logActivity } from '../services/activityLog.js';
import { sendEmail } from '../lib/mailer.js';
import jwt from 'jsonwebtoken';
import { uploadProfileImage } from '../lib/storage.js';

const router = Router();

// POST /auth/login
router.post('/login', validateBody(LoginSchema), async (req, res, next) => {
  try {
    const { login, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: login.toLowerCase().trim() }, { username: login.trim() }],
      },
      include: {
        company: {
          include: {
            package: true,
          },
        },
        _count: {
          select: { reports: true },
        },
      },
    });

    if (!user) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/username or password'));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/username or password'));
    }

    if (!user.isActive) {
      return next(new AppError(403, 'ACCOUNT_DEACTIVATED', 'Your account has been deactivated. Please contact support.'));
    }

    // Tenant check
    if (user.company) {
      if (!user.company.isActive) {
        return next(new AppError(403, 'COMPANY_INACTIVE', 'Your company subscription or account is deactivated.'));
      }
      if (!user.company.subIsActive && user.role !== 'PRODUCT_SUPER_ADMIN') {
        return next(new AppError(403, 'SUBSCRIPTION_INACTIVE', 'Subscription expired. Please contact company administrator.'));
      }
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Set secure HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    let enabledFeatures = (user.company?.package?.enabledFeatures as string[]) || [];
    if (enabledFeatures.length === 0 && user.companyId) {
      const defaultPkg =
        (await prisma.package.findFirst({
          where: { name: { contains: 'Enterprise', mode: 'insensitive' } },
        })) || (await prisma.package.findFirst({ orderBy: { id: 'asc' } }));
      if (defaultPkg) {
        enabledFeatures = (defaultPkg.enabledFeatures as string[]) || [];
        if (!user.company?.packageId) {
          await prisma.company.update({
            where: { id: user.companyId },
            data: { packageId: defaultPkg.id },
          }).catch(() => {});
        }
      }
    }

    if (user.companyId) {
      await logActivity({
        companyId: user.companyId,
        actorId: user.id,
        action: 'LOGIN',
        objectType: 'User',
        objectId: String(user.id),
        message: `${user.firstName} ${user.lastName} logged in`,
      });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        companyId: user.companyId,
        jobTitle: user.jobTitle,
        mustChangePassword: user.mustChangePassword,
        hrPermissions: user.hrPermissions,
        canManagePerformance: user.canManagePerformance,
        isManager: user._count.reports > 0,
      },
      token: accessToken,
      refreshToken,
      features: enabledFeatures,
      company: user.company
        ? {
            id: user.company.id,
            name: user.company.name,
            code: user.company.code,
            subdomain: user.company.subdomain,
            logo: user.company.logo,
            workingDays: user.company.workingDays,
            timezone: user.company.timezone,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return next(new AppError(401, 'REFRESH_TOKEN_REQUIRED', 'Refresh token is required'));
    }

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        _count: {
          select: { reports: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return next(new AppError(401, 'INVALID_TOKEN_USER', 'User not found or inactive'));
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    return next(new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token expired or invalid', error.message));
  }
});

// POST /auth/change-password
router.post('/change-password', authMiddleware, validateBody(ChangePasswordSchema), async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return next(new AppError(404, 'NOT_FOUND', 'User not found'));
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return next(new AppError(400, 'INCORRECT_OLD_PASSWORD', 'Current password is incorrect'));
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedNewPassword,
        mustChangePassword: false,
        tempPasswordExpiresAt: null,
      },
    });

    if (user.companyId) {
      await logActivity({
        companyId: user.companyId,
        actorId: user.id,
        action: 'CHANGE_PASSWORD',
        objectType: 'User',
        objectId: String(user.id),
        message: `${user.firstName} ${user.lastName} changed their password`,
      });
    }

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', validateBody(ForgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user) {
      const resetToken = jwt.sign(
        { userId: user.id, purpose: 'password_reset' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      await sendEmail({
        companyId: user.companyId || undefined,
        to: user.email,
        subject: 'Password Reset Request — Uptrix HRMS',
        html: `<p>Hello ${user.firstName},</p><p>Use the following token to reset your password: <code>${resetToken}</code></p>`,
        category: 'AUTH',
      });
    }

    return res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.',
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/reset-password
router.post('/reset-password', validateBody(ResetPasswordSchema), async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch {
      return next(new AppError(400, 'INVALID_RESET_TOKEN', 'Reset token is invalid or expired'));
    }

    if (payload.purpose !== 'password_reset') {
      return next(new AppError(400, 'INVALID_RESET_TOKEN', 'Invalid reset token'));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: false,
      },
    });

    return res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        company: {
          include: {
            package: true,
          },
        },
        department: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { reports: true },
        },
      },
    });

    if (!user) {
      return next(new AppError(404, 'NOT_FOUND', 'User not found'));
    }

    const { passwordHash, ...safeUser } = user;
    let enabledFeatures = (user.company?.package?.enabledFeatures as string[]) || [];
    if (enabledFeatures.length === 0 && user.companyId) {
      const defaultPkg =
        (await prisma.package.findFirst({
          where: { name: { contains: 'Enterprise', mode: 'insensitive' } },
        })) || (await prisma.package.findFirst({ orderBy: { id: 'asc' } }));
      if (defaultPkg) {
        enabledFeatures = (defaultPkg.enabledFeatures as string[]) || [];
        if (!user.company?.packageId) {
          await prisma.company.update({
            where: { id: user.companyId },
            data: { packageId: defaultPkg.id },
          }).catch(() => {});
        }
      }
    }

    return res.json({
      user: {
        ...safeUser,
        isManager: user._count.reports > 0,
      },
      features: enabledFeatures,
      company: user.company,
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/profile-photo (Uploads avatar to AWS S3 'image/' folder)
router.post('/profile-photo', authMiddleware, uploadProfileImage.any(), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[];
    const file = files && files.length > 0 ? files[0] : null;

    if (!file) {
      return next(new AppError(400, 'NO_FILE', 'No image file uploaded'));
    }

    const fileUrl = (file as any).location || `/image/${file.filename}`;
    const s3Key = (file as any).key || `image/${file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: { profilePhoto: fileUrl },
      include: {
        company: {
          include: { package: true },
        },
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { reports: true } },
      },
    });

    if (req.user!.companyId) {
      await logActivity({
        companyId: req.user!.companyId,
        actorId: req.user!.id,
        action: 'UPDATE_PROFILE_PHOTO',
        objectType: 'User',
        objectId: String(req.user!.id),
        message: `${req.user!.firstName} ${req.user!.lastName} updated their profile image in AWS S3 (image folder)`,
      });
    }

    const { passwordHash, ...safeUser } = updatedUser;

    return res.json({
      success: true,
      message: 'Profile image saved successfully to AWS S3 image folder',
      profilePhoto: updatedUser.profilePhoto,
      url: fileUrl,
      key: s3Key,
      user: {
        ...safeUser,
        isManager: updatedUser._count.reports > 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /auth/me
router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, emergencyContact, profilePhoto } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(profilePhoto !== undefined && { profilePhoto }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(emergencyContact !== undefined && { emergencyContact }),
      },
      include: {
        company: true,
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { reports: true } },
      },
    });

    const { passwordHash, ...safeUser } = updated;
    return res.json({
      user: {
        ...safeUser,
        isManager: updated._count.reports > 0,
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
