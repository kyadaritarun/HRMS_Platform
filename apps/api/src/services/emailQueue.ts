import { Queue, Worker, Job } from 'bullmq';
import redis, { isRedisReady } from '../lib/redis.js';
import { sendEmail } from '../lib/mailer.js';

export interface EmailJobPayload {
  companyId?: number;
  invoiceId?: number;
  to: string;
  subject: string;
  html: string;
  cc?: string;
  bcc?: string;
  category?: string;
  templateKey?: string;
}

const QUEUE_NAME = 'hrms-email-queue';

export let emailQueue: Queue<EmailJobPayload> | null = null;
export let emailWorker: Worker<EmailJobPayload> | null = null;

if (redis) {
  try {
    emailQueue = new Queue<EmailJobPayload>(QUEUE_NAME, {
      connection: redis as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    emailWorker = new Worker<EmailJobPayload>(
      QUEUE_NAME,
      async (job: Job<EmailJobPayload>) => {
        const result = await sendEmail(job.data);
        if (!result.success && result.error) {
          throw new Error(result.error);
        }
        return result;
      },
      {
        connection: redis as any,
        concurrency: 5,
      }
    );

    emailWorker.on('failed', (job, err) => {
      console.error(`[EmailQueue] Job ${job?.id} failed:`, err.message);
    });
  } catch (err) {
    emailQueue = null;
    emailWorker = null;
  }
}

/**
 * Dispatch an email asynchronously.
 * Enqueues in Redis BullMQ if Redis is active, or immediately invokes sendEmail as fallback.
 */
export async function queueEmail(payload: EmailJobPayload): Promise<void> {
  if (isRedisReady() && emailQueue) {
    try {
      await emailQueue.add('sendEmail', payload);
      return;
    } catch {
      // Fall through to fallback
    }
  }

  // Graceful in-memory async fallback if Redis queue is not active
  sendEmail(payload).catch((err) => {
    console.error('[EmailFallback] Direct send error:', err);
  });
}
