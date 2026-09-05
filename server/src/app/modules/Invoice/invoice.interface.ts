import { Types } from 'mongoose';

export type TPaymentStatus = 'unpaid' | 'partial' | 'paid';
export type TCommissionType = 'percent' | 'fixed';
export type TReportStatus = 'pending' | 'uploaded' | 'delivered';
export type TCommissionStatus = 'pending' | 'paid';

export type TReportFile = {
  url: string;
  publicId: string;
  resourceType: string;
  format?: string;
  version?: string;
  mimeType: string;
  originalName: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
};

/**
 * A booked test on an invoice. Name, code and price are snapshotted so a later
 * catalogue edit never rewrites what a patient was actually billed.
 */
export type TInvoiceItem = {
  _id?: Types.ObjectId;
  test: Types.ObjectId;
  testCode: string;
  testName: string;
  categoryName?: string;
  price: number;
  reportStatus: TReportStatus;
  reportFile?: TReportFile;
  deliveredAt?: Date;

  /**
   * A test called off after booking — a sample that could not be drawn, a
   * machine down, a patient who left. Cancelled lines stay on the invoice and
   * on the printed copy struck through: the patient was told about them, so
   * removing the row outright would make the bill disagree with what happened.
   * Only live lines count towards the totals.
   */
  isCancelled?: boolean;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelReason?: string;
};

export type TPatientSnapshot = {
  patientId: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  address?: string;
};

export type TReferrerSnapshot = {
  referrerCode: string;
  name: string;
  designation?: string;
  hospital?: string;
};

export type TInvoice = {
  _id?: Types.ObjectId;
  invoiceNumber: string;
  visitDate: Date;

  patient: Types.ObjectId;
  patientInfo: TPatientSnapshot;

  referrer?: Types.ObjectId;
  referrerInfo?: TReferrerSnapshot;

  items: TInvoiceItem[];

  /** Sum of item prices, before any discount. */
  grossAmount: number;
  /** Percent off the patient's bill. Defaults from the referrer. */
  discountPercent: number;
  discountAmount: number;
  /** grossAmount - discountAmount. What the patient owes. */
  netPayable: number;

  /** Cache of the non-voided Payment total. Never client-supplied. */
  paidAmount: number;
  /** netPayable - paidAmount. Never client-supplied. */
  dueAmount: number;
  /** Derived from paidAmount vs netPayable. Never client-supplied. */
  paymentStatus: TPaymentStatus;

  /** How the centre pays this referrer on this invoice. */
  commissionType: TCommissionType;
  /** A percentage when type is 'percent', a taka figure when 'fixed'. */
  commissionValue: number;
  /** Derived from type + value. Owed to the referrer. */
  commissionAmount: number;
  commissionStatus: TCommissionStatus;
  commissionPayout?: Types.ObjectId;

  notes?: string;
  createdBy: Types.ObjectId;
  isCancelled?: boolean;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
};
