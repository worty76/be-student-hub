import express from 'express';
import { getProductSalesStats, getMonthlySalesData, getAdminProfits, getMonthlyAdminProfits } from '../controllers/adminController';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints for statistics and management
 */

/**
 * @swagger
 * /api/admin/stats/products:
 *   get:
 *     summary: Get product sales statistics
 *     description: Get statistics about products sold, including total sales, revenue, categories, and top products. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sales from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sales until this date (YYYY-MM-DD)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by product category
 *     responses:
 *       200:
 *         description: Product sales statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSales:
 *                   type: integer
 *                   example: 245
 *                 totalRevenue:
 *                   type: number
 *                   example: 12450.75
 *                 categorySales:
 *                   type: object
 *                 topProducts:
 *                   type: array
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized as admin
 *       500:
 *         description: Server error
 */
router.get(
  '/stats/products',
  authenticate as any,
  isAdmin as any,
  // @ts-ignore - Type issues with Express 5
  getProductSalesStats
);

/**
 * @swagger
 * /api/admin/stats/monthly:
 *   get:
 *     summary: Get monthly sales data
 *     description: Get monthly sales data for charts and reports. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year to get data for (defaults to current year)
 *     responses:
 *       200:
 *         description: Monthly sales data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:
 *                     type: integer
 *                     example: 1
 *                   count:
 *                     type: integer
 *                     example: 25
 *                   revenue:
 *                     type: number
 *                     example: 1275.50
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized as admin
 *       500:
 *         description: Server error
 */
router.get(
  '/stats/monthly',
  authenticate as any,
  isAdmin as any,
  // @ts-ignore - Type issues with Express 5
  getMonthlySalesData
);

/**
 * @swagger
 * /api/admin/profits:
 *   get:
 *     summary: Get admin profit statistics
 *     description: Get comprehensive statistics about admin profits from completed transactions. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter profits from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter profits until this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Admin profit statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalProfit:
 *                   type: number
 *                   example: 1245.50
 *                 totalTransactions:
 *                   type: integer
 *                   example: 245
 *                 totalRevenue:
 *                   type: number
 *                   example: 24910.00
 *                 averageCommissionRate:
 *                   type: number
 *                   example: 0.1
 *                 monthlyProfits:
 *                   type: array
 *                 profitsByPaymentMethod:
 *                   type: object
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized as admin
 *       500:
 *         description: Server error
 */
router.get(
  '/profits',
  authenticate as any,
  isAdmin as any,
  // @ts-ignore - Type issues with Express 5
  getAdminProfits
);

/**
 * @swagger
 * /api/admin/profits/monthly:
 *   get:
 *     summary: Get monthly admin profit data
 *     description: Get monthly admin profit data for charts and reports. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year to get profit data for (defaults to current year)
 *     responses:
 *       200:
 *         description: Monthly admin profit data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:
 *                     type: integer
 *                     example: 1
 *                   profit:
 *                     type: number
 *                     example: 127.55
 *                   transactions:
 *                     type: integer
 *                     example: 25
 *                   revenue:
 *                     type: number
 *                     example: 2551.00
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized as admin
 *       500:
 *         description: Server error
 */
router.get(
  '/profits/monthly',
  authenticate as any,
  isAdmin as any,
  // @ts-ignore - Type issues with Express 5
  getMonthlyAdminProfits
);

export default router;