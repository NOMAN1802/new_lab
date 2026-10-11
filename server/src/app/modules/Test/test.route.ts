import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { TestControllers } from './test.controller';
import { TestValidations } from './test.validation';

const router = express.Router();

// Both roles maintain the catalogue, prices included.
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  validateRequest(TestValidations.createTestValidationSchema),
  TestControllers.createTest
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  TestControllers.getTests
);

router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  TestControllers.getTest
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  validateRequest(TestValidations.updateTestValidationSchema),
  TestControllers.updateTest
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.receptionist),
  TestControllers.deleteTest
);

export const testRoutes = router;
