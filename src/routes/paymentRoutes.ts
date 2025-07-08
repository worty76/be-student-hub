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
 * /api/payments/vnpay/create:
 *   post:
 *     summary: Create a new VNPay payment
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
 *               - shippingAddress
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to purchase
 *               shippingAddress:
 *                 type: string
 *                 description: Shipping address for product delivery
 *               bankCode:
 *                 type: string
 *                 description: Bank code for direct bank payment
 *               locale:
 *                 type: string
 *                 enum: [vn, en]
 *                 default: vn
 *                 description: Language for payment page
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
  '/vnpay/create',
  authenticate as any,
  [
    body('productId')
      .notEmpty()
      .withMessage('Product ID is required'),
    body('shippingAddress')
      .notEmpty()
      .withMessage('Shipping address is required')
  ],
  paymentController.createVNPayPayment
);

/**
 * @swagger
 * /api/payments/vnpay/return:
 *   get:
 *     summary: Handle VNPay payment return
 *     description: Endpoint for VNPay to return the user after payment completion
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: vnp_ResponseCode
 *         schema:
 *           type: string
 *         description: Response code from VNPay
 *       - in: query
 *         name: vnp_TxnRef
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       302:
 *         description: Redirects to success or failure page
 */
router.get('/vnpay/return', paymentController.handleVNPayReturn);

/**
 * @swagger
 * /api/payments/vnpay/ipn:
 *   get:
 *     summary: Handle VNPay IPN (Instant Payment Notification)
 *     description: Endpoint for VNPay to send payment notifications
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: IPN processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 RspCode:
 *                   type: string
 *                 Message:
 *                   type: string
 */
router.get('/vnpay/ipn', paymentController.handleVNPayIPN);

/**
 * @swagger
 * /api/payments/vnpay/query:
 *   post:
 *     summary: Query VNPay transaction status
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
 *               - orderId
 *               - transactionDate
 *             properties:
 *               orderId:
 *                 type: string
 *               transactionDate:
 *                 type: string
 *                 format: YYYYMMDDHHmmss
 *     responses:
 *       200:
 *         description: Transaction query result
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 */
router.post('/vnpay/query', authenticate as any, paymentController.queryVNPayTransaction);

/**
 * @swagger
 * /api/payments/vnpay/refund:
 *   post:
 *     summary: Request refund for VNPay transaction
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
 *               - orderId
 *               - transactionDate
 *               - amount
 *               - transactionType
 *             properties:
 *               orderId:
 *                 type: string
 *               transactionDate:
 *                 type: string
 *                 format: YYYYMMDDHHmmss
 *               amount:
 *                 type: number
 *               transactionType:
 *                 type: string
 *                 enum: [02, 03]
 *                 description: 02 for partial refund, 03 for full refund
 *     responses:
 *       200:
 *         description: Refund request result
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 */
router.post('/vnpay/refund', authenticate as any, paymentController.refundVNPayTransaction);

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
router.get('/:orderId/status', authenticate as any, paymentController.getPaymentStatus);

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

/**
 * @swagger
 * /api/payments/momo/ipn:
 *   post:
 *     summary: Handle MoMo IPN (Instant Payment Notification)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: IPN processed
 */
router.post('/momo/ipn', paymentController.handleMomoIPN);

/**
 * @swagger
 * /api/payments/purchases:
 *   get:
 *     summary: Get user purchase history
 *     description: Get detailed purchase history for the authenticated user with filtering and pagination
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, all]
 *           default: completed
 *         description: Filter by payment status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [books, electronics, furniture, clothing, vehicles, services, other]
 *         description: Filter by product category
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, amount]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Minimum purchase amount filter
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Maximum purchase amount filter
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for date range filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for date range filter
 *     responses:
 *       200:
 *         description: Purchase history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     purchases:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                     statistics:
 *                       type: object
 *       401:
 *         description: Not authenticated
 */
router.get('/purchases', authenticate as any, paymentController.getUserPurchaseHistory);

/**
 * @swagger
 * /api/payments/purchases/{orderId}:
 *   get:
 *     summary: Get detailed purchase information
 *     description: Get comprehensive details about a specific purchase
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID of the purchase
 *     responses:
 *       200:
 *         description: Purchase details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     transactionId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     paymentMethod:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                     shippingAddress:
 *                       type: string
 *                     purchaseDate:
 *                       type: string
 *                       format: date-time
 *                     product:
 *                       type: object
 *                     seller:
 *                       type: object
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Purchase not found
 */
router.get('/purchases/:orderId', authenticate as any, paymentController.getPurchaseDetails);

/**
 * @swagger
 * /api/payments/{orderId}/success:
 *   get:
 *     summary: Get payment success details
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID to get success details for
 *     responses:
 *       200:
 *         description: Payment success details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product purchased successfully"
 *                 product:
 *                   type: object
 *                 transaction:
 *                   type: object
 *       404:
 *         description: Payment or product not found
 *       400:
 *         description: Payment not completed
 */
router.get('/:orderId/success', paymentController.getPaymentSuccess);

/**
 * @swagger
 * /api/payments/confirm-receipt/{orderId}:
 *   post:
 *     summary: Confirm receipt of purchased product
 *     description: Allows the buyer to manually confirm they have received the product
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID of the purchase to confirm
 *     responses:
 *       200:
 *         description: Receipt confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     receivedSuccessfully:
 *                       type: boolean
 *                     receivedConfirmedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request or receipt already confirmed
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */
router.post('/confirm-receipt/:orderId', authenticate as any, paymentController.confirmReceipt);

export default router; 