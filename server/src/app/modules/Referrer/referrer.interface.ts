import { Types } from 'mongoose';

/**
 * A referring doctor or agent (RFE). Each carries a default patient-fee
 * waiver and a default commission rate; both pre-fill on booking and are
 * frozen onto the invoice so later rate changes never rewrite history.
 */
export type TReferrer = {
  _id?: Types.ObjectId;
  referrerCode: string;
  name: string;
  designation?: string;
  hospital?: string;
  phone: string;
  address?: string;
  /** Percent discount given to the patient. 0-100. */
  defaultWaiverPercent: number;
  /** Percent of net payable owed to the referrer. 0-100. */
  defaultCommissionPercent: number;
  isActive?: boolean;
  isDeleted?: boolean;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};
