import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const percent = z
  .number({ invalid_type_error: 'Must be a number' })
  .min(0, 'Cannot be negative')
  .max(100, 'Cannot exceed 100%');

/**
 * Note what is absent: grossAmount, waiverAmount, netPayable, paidAmount,
 * dueAmount and paymentStatus are all server-derived. Zod strips unknown keys,
 * so a client sending them has no effect.
 */
const createInvoiceValidationSchema = z.object({
  body: z.object({
    patient: objectId,
    referrer: objectId.optional(),
    testIds: z
      .array(objectId, { required_error: 'Select at least one test' })
      .min(1, 'Select at least one test'),
    visitDate: z.string().datetime().optional(),
    waiverPercent: percent.optional(),
    commissionPercent: percent.optional(),
    notes: z.string().trim().optional(),
    collectFullPayment: z.boolean().optional(),
  }),
});

const updateInvoiceItemsValidationSchema = z.object({
  body: z.object({
    testIds: z.array(objectId).min(1, 'Select at least one test'),
    waiverPercent: percent.optional(),
    commissionPercent: percent.optional(),
  }),
});

const cancelInvoiceValidationSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(1, 'A cancellation reason is required'),
  }),
});

export const InvoiceValidations = {
  createInvoiceValidationSchema,
  updateInvoiceItemsValidationSchema,
  cancelInvoiceValidationSchema,
};
