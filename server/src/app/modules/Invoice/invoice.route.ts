import express from 'express';
import { reportUpload } from '../../config/multer.config';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { InvoiceControllers } from './invoice.controller';
import { InvoiceValidations } from './invoice.validation';

const router = express.Router();

// Booking is reception work. The controller strips the waiver and commission
// figures from what a receptionist receives back.
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  validateRequest(InvoiceValidations.createInvoiceValidationSchema),
  InvoiceControllers.createInvoice
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  InvoiceControllers.getInvoices
);

router.get(
  '/patient/:patientId',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  InvoiceControllers.getPatientInvoices
);

router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  InvoiceControllers.getInvoice
);

// Changing billed tests or overriding rates is an Admin decision.
router.patch(
  '/:id/items',
  auth(USER_ROLE.admin),
  validateRequest(InvoiceValidations.updateInvoiceItemsValidationSchema),
  InvoiceControllers.updateInvoiceItems
);

router.patch(
  '/:id/cancel',
  auth(USER_ROLE.admin),
  validateRequest(InvoiceValidations.cancelInvoiceValidationSchema),
  InvoiceControllers.cancelInvoice
);

// Report handling - both roles per proposal §4.7.
router.post(
  '/:id/items/:itemId/report',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  reportUpload.single('report'),
  InvoiceControllers.uploadItemReport
);

router.patch(
  '/:id/items/:itemId/deliver',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  InvoiceControllers.markReportDelivered
);

router.get(
  '/:id/items/:itemId/report',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  InvoiceControllers.getReportDownloadUrl
);

export const invoiceRoutes = router;
