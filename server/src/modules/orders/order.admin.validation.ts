import { z } from 'zod';

export const orderStatusUpdateSchema = z.object({
  nextStatus: z.enum(['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled']),
  reason: z.string().trim().max(240).optional(),
  courierName: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
});

export const orderPaymentStatusUpdateSchema = z.object({
  paymentStatus: z.enum([
    'unpaid',
    'initiated',
    'pending',
    'authorized',
    'paid',
    'failed',
    'cancelled',
    'expired',
    'refund_pending',
    'partially_refunded',
    'refunded',
  ]),
  note: z.string().trim().max(240).optional(),
});

export const orderNoteSchema = z.object({
  note: z.string().trim().min(2).max(500),
});

export const returnUpdateSchema = z.object({
  status: z.enum(['approved', 'rejected', 'received', 'refunded']),
  inspectionNotes: z.string().trim().max(500).optional(),
  restockEligible: z.boolean().default(false),
});

export const cancellationRequestReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().trim().max(500).optional().default(''),
});

export const adminRefundSchema = z.object({
  amount: z.number().positive().max(10_000_000).optional(),
  reason: z.string().trim().min(3, 'Please provide a refund reason.').max(240),
});
