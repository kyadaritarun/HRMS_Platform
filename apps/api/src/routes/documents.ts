import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { hrPermission } from '../middlewares/hrPermission.js';
import { validateBody } from '../middlewares/validate.js';
import { AppError } from '../middlewares/errorHandler.js';
import { upload } from '../lib/storage.js';
import { RejectDocumentSchema, UploadDocumentSchema } from '../schemas/document.js';
import { logActivity } from '../services/activityLog.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// GET /company/documents/review (HR & Admin)
router.get('/review', roleGuard('COMPANY_ADMIN', 'HR'), hrPermission('documents'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const status = (req.query.status as string) || 'PENDING';

    const where: any = { companyId };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ documents });
  } catch (error) {
    next(error);
  }
});

// PATCH /documents/:id/verify (HR & Admin)
router.patch('/:id/verify', roleGuard('COMPANY_ADMIN', 'HR'), hrPermission('documents'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const docId = Number(req.params.id);

    const doc = await prisma.document.findFirst({
      where: { id: docId, companyId },
    });
    if (!doc) {
      return next(new AppError(404, 'NOT_FOUND', 'Document not found'));
    }

    const updated = await prisma.document.update({
      where: { id: docId },
      data: {
        status: 'VERIFIED',
        rejectionNote: '',
      },
    });

    await logActivity({
      companyId,
      actorId: req.user!.id,
      action: 'VERIFY_DOCUMENT',
      objectType: 'Document',
      objectId: String(docId),
      message: `Verified document '${doc.title}' for user #${doc.userId}`,
    });

    return res.json({ success: true, document: updated });
  } catch (error) {
    next(error);
  }
});

// PATCH /documents/:id/reject (HR & Admin)
router.patch(
  '/:id/reject',
  roleGuard('COMPANY_ADMIN', 'HR'),
  hrPermission('documents'),
  validateBody(RejectDocumentSchema),
  async (req, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const docId = Number(req.params.id);
      const { rejectionNote } = req.body;

      const doc = await prisma.document.findFirst({
        where: { id: docId, companyId },
      });
      if (!doc) {
        return next(new AppError(404, 'NOT_FOUND', 'Document not found'));
      }

      const updated = await prisma.document.update({
        where: { id: docId },
        data: {
          status: 'REJECTED',
          rejectionNote,
        },
      });

      await logActivity({
        companyId,
        actorId: req.user!.id,
        action: 'REJECT_DOCUMENT',
        objectType: 'Document',
        objectId: String(docId),
        message: `Rejected document '${doc.title}' for user #${doc.userId}. Note: ${rejectionNote}`,
      });

      return res.json({ success: true, document: updated });
    } catch (error) {
      next(error);
    }
  }
);

// GET /documents (Self-service: caller's own documents)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ documents });
  } catch (error) {
    next(error);
  }
});

// POST /documents (Upload new document)
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const body = req.body;

    const validated = UploadDocumentSchema.parse({
      category: body.category,
      title: body.title,
      identifier: body.identifier || '',
      notes: body.notes || '',
      issueDate: body.issueDate,
      expiryDate: body.expiryDate,
      data: body.data ? (typeof body.data === 'string' ? JSON.parse(body.data) : body.data) : {},
    });

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : body.fileUrl || null;

    const initialVersion = [
      {
        version: 1,
        fileUrl: fileUrl || '',
        uploadedById: userId,
        at: new Date().toISOString(),
        snapshot: validated.data,
      },
    ];

    const document = await prisma.document.create({
      data: {
        companyId,
        userId,
        uploadedById: userId,
        category: validated.category,
        title: validated.title,
        identifier: validated.identifier,
        notes: validated.notes,
        fileUrl,
        issueDate: validated.issueDate ? new Date(validated.issueDate) : null,
        expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
        data: validated.data as any,
        versions: initialVersion as any,
        status: 'PENDING',
      },
    });

    await logActivity({
      companyId,
      actorId: userId,
      action: 'UPLOAD_DOCUMENT',
      objectType: 'Document',
      objectId: String(document.id),
      message: `Uploaded document: ${validated.title} (${validated.category})`,
    });

    return res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
});

// PATCH /documents/:id (Re-upload appends to versions)
router.patch('/:id', upload.single('file'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const docId = Number(req.params.id);

    const doc = await prisma.document.findFirst({
      where: { id: docId, userId },
    });
    if (!doc) {
      return next(new AppError(404, 'NOT_FOUND', 'Document not found'));
    }

    const currentVersions = Array.isArray(doc.versions) ? (doc.versions as any[]) : [];
    const newVersionNumber = currentVersions.length + 1;
    const newFileUrl = req.file ? `/uploads/${req.file.filename}` : doc.fileUrl;

    const updatedVersions = [
      ...currentVersions,
      {
        version: newVersionNumber,
        fileUrl: newFileUrl || '',
        uploadedById: userId,
        at: new Date().toISOString(),
        snapshot: doc.data,
      },
    ];

    const updated = await prisma.document.update({
      where: { id: docId },
      data: {
        fileUrl: newFileUrl,
        versions: updatedVersions as any,
        status: 'PENDING',
        rejectionNote: '',
      },
    });

    await logActivity({
      companyId: doc.companyId,
      actorId: userId,
      action: 'REUPLOAD_DOCUMENT',
      objectType: 'Document',
      objectId: String(docId),
      message: `Re-uploaded document version #${newVersionNumber}: ${doc.title}`,
    });

    return res.json({ document: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
