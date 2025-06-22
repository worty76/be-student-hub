import express from "express";
import { body } from "express-validator";
import * as productController from "../controllers/productController";
import { authenticate, isAdmin } from "../middleware/auth";
import { cloudinaryUpload } from "../config/cloudinary";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - price
 *         - category
 *         - condition
 *         - seller
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the product
 *         title:
 *           type: string
 *           description: Product title
 *         description:
 *           type: string
 *           description: Product description
 *         price:
 *           type: number
 *           description: Product price
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of image URLs
 *         category:
 *           type: string
 *           enum: [books, electronics, furniture, clothing, vehicles, services, other]
 *           description: Product category
 *         condition:
 *           type: string
 *           enum: [new, like new, good, fair, poor]
 *           description: Product condition
 *         status:
 *           type: string
 *           enum: [available, pending, sold]
 *           description: Product status
 *         seller:
 *           type: string
 *           description: Reference to the User ID who posted the product
 *         location:
 *           type: string
 *           description: Product location
 *         views:
 *           type: number
 *           description: Number of views
 *         favorites:
 *           type: number
 *           description: Number of users who favorited this product
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management API
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *         description: Filter by condition
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get("/", productController.getAllProducts);

/**
 * @swagger
 * /api/products/favorites:
 *   get:
 *     summary: Get user's favorite products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
// @ts-ignore - Type issues with Express 5
router.get("/favorites", authenticate, productController.getFavoriteProducts);

/**
 * @swagger
 * /api/products/user/{userId}:
 *   get:
 *     summary: Get products by user ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of products by user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
// @ts-ignore - Type issues with Express 5
router.get("/user/:userId", productController.getProductsByUser);

/**
 * @swagger
 * /api/products/search/{query}:
 *   get:
 *     summary: Search products
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
// @ts-ignore - Type issues with Express 5
router.get("/search/:query", productController.searchProducts);

/**
 * @swagger
 * /api/products/category/{category}:
 *   get:
 *     summary: Get products by category
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: category
 *         schema:
 *           type: string
 *         required: true
 *         description: Category name
 *     responses:
 *       200:
 *         description: List of products in category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
// @ts-ignore - Type issues with Express 5
router.get("/category/:category", productController.getProductsByCategory);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
// @ts-ignore - Type issues with Express 5
router.get("/:id", productController.getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               condition:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *             required:
 *               - title
 *               - description
 *               - price
 *               - category
 *               - condition
 *     responses:
 *       201:
 *         description: Created product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
// @ts-ignore - Type issues with Express 5
router.post(
  "/",
  authenticate as any,
  cloudinaryUpload.array("images", 5),
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("price").isNumeric().withMessage("Price must be a number"),
    body("category").notEmpty().withMessage("Category is required"),
    body("condition").notEmpty().withMessage("Condition is required"),
  ],
  productController.createProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               condition:
 *                 type: string
 *               status:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Updated product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
// @ts-ignore - Type issues with Express 5
router.put(
  "/:id",
  authenticate as any,
  cloudinaryUpload.array("images", 5),
  [
    body("title").optional(),
    body("description").optional(),
    body("price").optional().isNumeric().withMessage("Price must be a number"),
    body("category").optional(),
    body("condition").optional(),
    body("status").optional(),
  ],
  productController.updateProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product removed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
// @ts-ignore - Type issues with Express 5
router.delete("/:id", authenticate, productController.deleteProduct);

/**
 * @swagger
 * /api/products/{id}/favorite:
 *   post:
 *     summary: Add product to favorites
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product added to favorites
 *       400:
 *         description: Product already in favorites
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
// @ts-ignore - Type issues with Express 5
router.post("/:id/favorite", authenticate, productController.addToFavorites);

/**
 * @swagger
 * /api/products/{id}/favorite:
 *   delete:
 *     summary: Remove product from favorites
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product removed from favorites
 *       400:
 *         description: Product not in favorites
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
// @ts-ignore - Type issues with Express 5
router.delete(
  "/:id/favorite",
  authenticate as any,
  productController.removeFromFavorites
);

/**
 * @swagger
 * /api/products/{id}/buy:
 *   post:
 *     summary: Buy a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, transfer, other]
 *                 description: Payment method
 *               shippingAddress:
 *                 type: string
 *                 description: Shipping address for the product
 *             required:
 *               - paymentMethod
 *     responses:
 *       200:
 *         description: Product purchased successfully
 *       400:
 *         description: Invalid input or product not available
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.post(
  "/:id/buy",
  authenticate as any,
  [
    body("paymentMethod")
      .isIn(["cash", "transfer", "other"])
      .withMessage("Valid payment method is required"),
    body("shippingAddress").optional(),
  ],
  productController.buyProduct
);

/**
 * @swagger
 * /api/products/{id}/report:
 *   post:
 *     summary: Report a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [inappropriate, fake, spam, other]
 *                 description: Reason for reporting
 *               description:
 *                 type: string
 *                 description: Additional details about the report
 *             required:
 *               - reason
 *     responses:
 *       201:
 *         description: Product reported successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
// @ts-ignore - Type issues with Express 5
router.post(
  "/:id/report",
  authenticate as any,
  [
    body("reason")
      .isIn(["inappropriate", "fake", "spam", "other"])
      .withMessage("Valid reason is required"),
    body("description").optional(),
  ],
  productController.reportProduct
);

/**
 * @swagger
 * /api/products/admin/all:
 *   get:
 *     summary: Get all products (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of all products
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get(
  "/admin/all",
  authenticate as any,
  isAdmin as any,
  productController.getAllProductsAdmin
);

/**
 * @swagger
 * /api/products/admin/{id}:
 *   put:
 *     summary: Update any product (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               condition:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product updated by admin
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Product not found
 */
router.put(
  "/admin/:id",
  authenticate as any,
  isAdmin as any,
  [
    body("title").optional(),
    body("description").optional(),
    body("price").optional().isNumeric().withMessage("Price must be a number"),
    body("category").optional(),
    body("condition").optional(),
    body("status").optional(),
  ],
  productController.updateProductAdmin
);

/**
 * @swagger
 * /api/products/admin/{id}:
 *   delete:
 *     summary: Delete any product (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product removed by admin
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Product not found
 */
router.delete(
  "/admin/:id",
  authenticate as any,
  isAdmin as any,
  productController.deleteProductAdmin
);

/**
 * @swagger
 * /api/products/admin/reports:
 *   get:
 *     summary: Get reported products (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, dismissed]
 *         description: Report status
 *     responses:
 *       200:
 *         description: List of reported products
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get(
  "/admin/reports",
  authenticate as any,
  isAdmin as any,
  productController.getReportedProducts
);

export default router;
