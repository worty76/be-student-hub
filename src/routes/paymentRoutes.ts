import express from 'express';
import { body } from 'express-validator';
import * as paymentController from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment API
 */

/**
 * @swagger
 * /api/payments/momo/create:
 *   post:
 *     summary: Create a new MoMo payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to purchase
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payUrl:
 *                   type: string
 *                   description: URL to redirect user for payment
 *                 orderId:
 *                   type: string
 *                   description: Order ID for tracking
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Product not found
 */
router.post(
  '/momo/create',
  authenticate as any,
  [
    body('productId')
      .notEmpty()
      .withMessage('Product ID is required')
  ],
  paymentController.createPayment
);

/**
 * @swagger
 * /api/payments/{orderId}/status:
 *   get:
 *     summary: Get payment status by order ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Payment status
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */
// @ts-ignore - Type issues with Express 5
router.get('/:orderId/status', authenticate, paymentController.getPaymentStatus);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history
 *       401:
 *         description: Not authenticated
 */
router.get('/history', authenticate as any, paymentController.getPaymentHistory);

export default router; 