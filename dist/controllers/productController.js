"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseProduct = exports.getPendingProducts = exports.rejectProduct = exports.approveProduct = exports.getReportedProducts = exports.deleteProductAdmin = exports.updateProductAdmin = exports.getAllProductsAdmin = exports.reportProduct = exports.buyProduct = exports.getFavoriteProducts = exports.removeFromFavorites = exports.addToFavorites = exports.getProductsByCategory = exports.searchProducts = exports.getProductsByUser = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
const express_validator_1 = require("express-validator");
const Product_1 = __importDefault(require("../models/Product"));
const User_1 = __importDefault(require("../models/User"));
const Report_1 = __importDefault(require("../models/Report"));
const cloudinary_1 = require("../config/cloudinary");
const vnpayService_1 = require("../services/vnpayService");
const Payment_1 = __importDefault(require("../models/Payment"));
const moment_1 = __importDefault(require("moment"));
// Get all products with filters
const getAllProducts = async (req, res) => {
    try {
        const { category, minPrice, maxPrice, condition, status, sort = "createdAt", order = "desc", page = 1, limit = 10, } = req.query;
        // Build filter object
        const filter = {};
        // For regular users (non-admin), only show approved products
        // Admin can see all products by explicitly setting status filter
        if (!req.user || req.user.role !== "admin") {
            filter.status = "available"; // Only show approved products to regular users
        }
        else {
            // For admin, apply status filter if provided
            if (status)
                filter.status = status;
        }
        if (category)
            filter.category = category;
        if (condition)
            filter.condition = condition;
        // Price range
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice)
                filter.price.$gte = Number(minPrice);
            if (maxPrice)
                filter.price.$lte = Number(maxPrice);
        }
        // Build sort object
        const sortObj = {};
        sortObj[sort] = order === "asc" ? 1 : -1;
        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit);
        // Execute query
        const products = await Product_1.default.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit))
            .populate("seller", "name avatar rating");
        // Get total count for pagination
        const total = await Product_1.default.countDocuments(filter);
        res.json({
            products,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getAllProducts = getAllProducts;
// Get product by ID
const getProductById = async (req, res) => {
    try {
        const product = await Product_1.default.findById(req.params.id).populate("seller", "name avatar rating ratingCount location");
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Increment view count
        product.views += 1;
        await product.save();
        res.json(product);
    }
    catch (error) {
        console.error("Get product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getProductById = getProductById;
// Create a new product
const createProduct = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { title, description, price, category, condition } = req.body;
        // Get file paths if images were uploaded
        const images = req.files
            ? req.files.map((file) => file.path || file.location)
            : [];
        // Create new product with pending status - requires admin approval
        const product = new Product_1.default({
            title,
            description,
            price,
            images,
            category,
            condition,
            status: 'pending', // Default to pending for admin approval
            seller: req.user.id,
            location: req.user.location,
        });
        await product.save();
        res.status(201).json({
            ...product.toObject(),
            message: "Sản phẩm đã được tạo và đang chờ duyệt từ admin"
        });
    }
    catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.createProduct = createProduct;
// Update a product
const updateProduct = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { title, description, price, category, condition, status } = req.body;
        // Find product
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Check if user owns the product
        if (product.seller.toString() !== req.user.id) {
            res
                .status(403)
                .json({ message: "Not authorized to update this product" });
            return;
        }
        // Update fields
        if (title)
            product.title = title;
        if (description)
            product.description = description;
        if (price)
            product.price = price;
        if (category)
            product.category = category;
        if (condition)
            product.condition = condition;
        if (status)
            product.status = status;
        // Add new images if uploaded
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map((file) => file.path || file.location);
            product.images = [...product.images, ...newImages];
        }
        await product.save();
        res.json(product);
    }
    catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateProduct = updateProduct;
// Delete a product
const deleteProduct = async (req, res) => {
    try {
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Check if user owns the product
        if (product.seller.toString() !== req.user.id) {
            res
                .status(403)
                .json({ message: "Not authorized to delete this product" });
            return;
        }
        // Delete images from Cloudinary
        for (const imageUrl of product.images) {
            if (imageUrl.includes("cloudinary")) {
                // Extract public_id from Cloudinary URL
                const publicId = imageUrl.split("/").pop()?.split(".")[0];
                if (publicId) {
                    await cloudinary_1.cloudinary.uploader.destroy(`studenthub/${publicId}`);
                }
            }
        }
        await product.deleteOne();
        res.json({ message: "Product removed" });
    }
    catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteProduct = deleteProduct;
// Get products by user ID
const getProductsByUser = async (req, res) => {
    try {
        const products = await Product_1.default.find({ seller: req.params.userId }).sort({
            createdAt: -1,
        });
        res.json(products);
    }
    catch (error) {
        console.error("Get user products error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getProductsByUser = getProductsByUser;
// Search products
const searchProducts = async (req, res) => {
    try {
        const { query } = req.params;
        const products = await Product_1.default.find({ $text: { $search: query } }, { score: { $meta: "textScore" } })
            .sort({ score: { $meta: "textScore" } })
            .populate("seller", "name avatar");
        res.json(products);
    }
    catch (error) {
        console.error("Search products error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.searchProducts = searchProducts;
// Get products by category
const getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const products = await Product_1.default.find({ category })
            .sort({ createdAt: -1 })
            .populate("seller", "name avatar");
        res.json(products);
    }
    catch (error) {
        console.error("Get category products error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getProductsByCategory = getProductsByCategory;
// Add product to favorites
const addToFavorites = async (req, res) => {
    try {
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Check if product is already in favorites
        if (user.favorites.some((favId) => favId.toString() === product._id.toString())) {
            res.status(400).json({ message: "Product already in favorites" });
            return;
        }
        // Add to favorites
        user.favorites.push(product._id);
        await user.save();
        // Increment favorites count
        product.favorites += 1;
        await product.save();
        res.json({ message: "Product added to favorites" });
    }
    catch (error) {
        console.error("Add to favorites error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.addToFavorites = addToFavorites;
// Remove product from favorites
const removeFromFavorites = async (req, res) => {
    try {
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Check if product is in favorites
        if (!user.favorites.some((favId) => favId.toString() === product._id.toString())) {
            res.status(400).json({ message: "Product not in favorites" });
            return;
        }
        // Remove from favorites
        user.favorites = user.favorites.filter((favId) => favId.toString() !== product._id.toString());
        await user.save();
        // Decrement favorites count
        product.favorites = Math.max(0, product.favorites - 1);
        await product.save();
        res.json({ message: "Product removed from favorites" });
    }
    catch (error) {
        console.error("Remove from favorites error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.removeFromFavorites = removeFromFavorites;
// Get user's favorite products
const getFavoriteProducts = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id).populate({
            path: "favorites",
            populate: {
                path: "seller",
                select: "name avatar",
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(user.favorites);
    }
    catch (error) {
        console.error("Get favorites error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getFavoriteProducts = getFavoriteProducts;
// Buy a product
const buyProduct = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { paymentMethod, shippingAddress } = req.body;
        const buyerId = req.user.id;
        // Find product
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Check if product is available
        if (product.status !== "available") {
            res
                .status(400)
                .json({ message: "Product is not available for purchase" });
            return;
        }
        // Check if user is trying to buy their own product
        if (product.seller.toString() === buyerId) {
            res.status(400).json({ message: "You cannot buy your own product" });
            return;
        }
        // Create payment record for cash transaction
        const orderId = `CASH${(0, moment_1.default)().format('YYMMDDHHmmss')}${Math.floor(Math.random() * 1000)}`;
        const payment = new Payment_1.default({
            orderId,
            requestId: orderId,
            amount: product.price,
            productId: product._id,
            buyerId,
            sellerId: product.seller,
            paymentMethod,
            paymentStatus: 'completed', // Cash payments are immediately completed
            shippingAddress: shippingAddress || "Not provided",
        });
        await payment.save();
        // Update product status to sold and add buyer
        product.status = "sold";
        product.buyer = buyerId;
        await product.save();
        res.json({
            message: "Product purchased successfully",
            product: product,
            transaction: {
                buyer: buyerId,
                seller: product.seller,
                product: product._id,
                amount: product.price,
                paymentMethod,
                shippingAddress: shippingAddress || "Not provided",
                date: new Date(),
                orderId: orderId
            },
        });
    }
    catch (error) {
        console.error("Buy product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.buyProduct = buyProduct;
// Report a product
const reportProduct = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { reason, description } = req.body;
        const reporterId = req.user.id;
        // Find product
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        } // Check if user is reporting their own product
        if (product.seller.toString() === reporterId) {
            res.status(400).json({ message: "You cannot report your own product" });
            return;
        }
        // Create a report
        const newReport = new Report_1.default({
            type: "product",
            product: product._id,
            reporter: reporterId,
            reported: product.seller,
            reason,
            description: description || "",
            status: "pending",
        });
        await newReport.save();
        res.status(201).json({
            message: "Product reported successfully",
            report: newReport,
        });
    }
    catch (error) {
        console.error("Report product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.reportProduct = reportProduct;
// ADMIN PRODUCT FUNCTIONS
// Get all products (admin)
const getAllProductsAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, category, sort = "createdAt", order = "desc", } = req.query;
        // Build filter object
        const filter = {};
        if (status)
            filter.status = status;
        if (category)
            filter.category = category;
        // Build sort object
        const sortObj = {};
        sortObj[sort] = order === "asc" ? 1 : -1;
        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit);
        // Get products with seller info
        const products = await Product_1.default.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit))
            .populate("seller", "name email");
        // Get total count for pagination
        const total = await Product_1.default.countDocuments(filter);
        res.json({
            products,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Admin get all products error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getAllProductsAdmin = getAllProductsAdmin;
// Admin update product
const updateProductAdmin = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { title, description, price, category, condition, status } = req.body;
        // Find product
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Update fields
        if (title)
            product.title = title;
        if (description)
            product.description = description;
        if (price)
            product.price = price;
        if (category)
            product.category = category;
        if (condition)
            product.condition = condition;
        if (status)
            product.status = status;
        await product.save();
        res.json({
            message: "Product updated by admin",
            product,
        });
    }
    catch (error) {
        console.error("Admin update product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateProductAdmin = updateProductAdmin;
// Admin delete product
const deleteProductAdmin = async (req, res) => {
    try {
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Delete images from Cloudinary
        for (const imageUrl of product.images) {
            if (imageUrl.includes("cloudinary")) {
                const publicId = imageUrl.split("/").pop()?.split(".")[0];
                if (publicId) {
                    await cloudinary_1.cloudinary.uploader.destroy(`studenthub/${publicId}`);
                }
            }
        }
        await product.deleteOne();
        res.json({ message: "Product removed by admin" });
    }
    catch (error) {
        console.error("Admin delete product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteProductAdmin = deleteProductAdmin;
// Get reported products (admin)
const getReportedProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = "pending", // pending, reviewed, dismissed
         } = req.query;
        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit);
        // Find reports for products
        const reports = await Report_1.default.find({
            type: "product",
            status: status,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate("product")
            .populate("reporter", "name email")
            .populate("reported", "name email");
        // Get total count for pagination
        const total = await Report_1.default.countDocuments({
            type: "product",
            status: status,
        });
        res.json({
            reports,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get reported products error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getReportedProducts = getReportedProducts;
// Approve a product (admin)
const approveProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        // Find product
        const product = await Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Check if product is pending
        if (product.status !== "pending") {
            res.status(400).json({ message: "Product is not pending approval" });
            return;
        }
        // Approve product
        product.status = "available";
        await product.save();
        res.json({
            message: "Product approved successfully",
            product,
        });
    }
    catch (error) {
        console.error("Approve product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.approveProduct = approveProduct;
// Reject a product (admin)
const rejectProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { reason } = req.body;
        // Find product
        const product = await Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Check if product is pending
        if (product.status !== "pending") {
            res.status(400).json({ message: "Product is not pending approval" });
            return;
        }
        // For now, we'll delete rejected products
        // In a real system, you might want to store rejection reasons
        await product.deleteOne();
        res.json({
            message: "Product rejected and removed",
            reason: reason || "No reason provided",
        });
    }
    catch (error) {
        console.error("Reject product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.rejectProduct = rejectProduct;
// Get pending products (admin)
const getPendingProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, sort = "createdAt", order = "desc", } = req.query;
        // Build sort object
        const sortObj = {};
        sortObj[sort] = order === "asc" ? 1 : -1;
        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit);
        // Get pending products with seller info
        const products = await Product_1.default.find({ status: "pending" })
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit))
            .populate("seller", "name email");
        // Get total count for pagination
        const total = await Product_1.default.countDocuments({ status: "pending" });
        res.json({
            products,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get pending products error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getPendingProducts = getPendingProducts;
/**
 * Purchase a product using VNPay
 * @route POST /api/products/:id/purchase
 * @access Private
 */
const purchaseProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { bankCode, locale, shippingAddress } = req.body;
        const buyerId = req.user.id;
        // Find product
        const product = await Product_1.default.findById(id);
        if (!product) {
            res.status(404).json({ message: 'Sản phẩm không tồn tại' });
            return;
        }
        // Check if product is available
        if (product.status !== 'available') {
            res.status(400).json({ message: 'Sản phẩm không khả dụng' });
            return;
        }
        // Check if user is trying to buy their own product
        if (product.seller.toString() === buyerId) {
            res.status(400).json({ message: 'Bạn không thể mua sản phẩm của chính mình' });
            return;
        }
        // Check if shipping address is provided
        if (!shippingAddress) {
            res.status(400).json({ message: 'Địa chỉ giao hàng là bắt buộc' });
            return;
        }
        // Generate unique order ID
        const date = new Date();
        const orderId = `VNP${(0, moment_1.default)(date).format('YYMMDDHHmmss')}`;
        // Get client IP address
        const ipAddr = req.headers['x-forwarded-for'] ||
            req.socket.remoteAddress ||
            '127.0.0.1';
        // Create payment in database
        const payment = new Payment_1.default({
            orderId,
            requestId: orderId,
            amount: product.price,
            productId: product._id,
            buyerId,
            sellerId: product.seller,
            paymentMethod: 'vnpay',
            paymentStatus: 'pending',
            shippingAddress,
        });
        await payment.save();
        // Create VNPay payment URL
        const returnUrl = `${req.protocol}://${req.get('host')}/api/payments/vnpay/return`;
        const paymentUrl = vnpayService_1.vnpayService.createPaymentUrl({
            amount: product.price,
            orderId,
            orderInfo: `Thanh toán cho sản phẩm: ${product.title}`,
            bankCode: bankCode || undefined,
            locale: locale || 'vn',
            ipAddr: typeof ipAddr === 'string' ? ipAddr : ipAddr[0],
            returnUrl,
        });
        // Update payment with payUrl
        payment.payUrl = paymentUrl;
        await payment.save();
        // Return payment URL
        res.status(200).json({
            success: true,
            payUrl: paymentUrl,
            orderId,
            product: {
                id: product._id,
                title: product.title,
                price: product.price,
                image: product.images && product.images.length > 0 ? product.images[0] : null
            }
        });
    }
    catch (error) {
        console.error('Product purchase error:', error);
        res.status(500).json({ message: error.message || 'Lỗi khi mua sản phẩm' });
    }
};
exports.purchaseProduct = purchaseProduct;
