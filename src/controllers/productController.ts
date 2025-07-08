import { Request, Response } from "express";
import { validationResult } from "express-validator";
import Product from "../models/Product";
import User from "../models/User";
import Report from "../models/Report";
import { cloudinary } from "../config/cloudinary";
import mongoose from "mongoose";
import { vnpayService } from '../services/vnpayService';
import Payment from '../models/Payment';
import moment from 'moment';

// Get all products with filters
export const getAllProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      condition,
      status,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter object
    const filter: any = {};

    // For regular users (non-admin), only show approved products
    // Admin can see all products by explicitly setting status filter
    if (!req.user || req.user.role !== "admin") {
      filter.status = "available"; // Only show approved products to regular users
    } else {
      // For admin, apply status filter if provided
      if (status) filter.status = status;
    }

    if (category) filter.category = category;
    if (condition) filter.condition = condition;

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = order === "asc" ? 1 : -1;

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .populate("seller", "name avatar rating");

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get product by ID
export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "seller",
      "name avatar rating ratingCount location"
    );

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // Increment view count
    product.views += 1;
    await product.save();

    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new product
export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { title, description, price, category, condition } = req.body;

    // Get file paths if images were uploaded
    const images = req.files
      ? (req.files as Express.Multer.File[]).map(
          (file: any) => file.path || file.location
        )
      : [];

    // Create new product with pending status - requires admin approval
    const product = new Product({
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
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a product
export const updateProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { title, description, price, category, condition, status } = req.body;

    // Find product
    const product = await Product.findById(req.params.id);

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
    if (title) product.title = title;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category) product.category = category;
    if (condition) product.condition = condition;
    if (status) product.status = status;

    // Add new images if uploaded
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      const newImages = (req.files as Express.Multer.File[]).map(
        (file: any) => file.path || file.location
      );
      product.images = [...product.images, ...newImages];
    }

    await product.save();

    res.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a product
export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

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
          await cloudinary.uploader.destroy(`studenthub/${publicId}`);
        }
      }
    }

    await product.deleteOne();

    res.json({ message: "Product removed" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get products by user ID
export const getProductsByUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const products = await Product.find({ seller: req.params.userId }).sort({
      createdAt: -1,
    });

    res.json(products);
  } catch (error) {
    console.error("Get user products error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Search products
export const searchProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query } = req.params;

    const products = await Product.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .populate("seller", "name avatar");

    res.json(products);
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get products by category
export const getProductsByCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { category } = req.params;

    const products = await Product.find({ category })
      .sort({ createdAt: -1 })
      .populate("seller", "name avatar");

    res.json(products);
  } catch (error) {
    console.error("Get category products error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add product to favorites
export const addToFavorites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if product is already in favorites
    if (
      user.favorites.some(
        (favId) => favId.toString() === product._id.toString()
      )
    ) {
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
  } catch (error) {
    console.error("Add to favorites error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove product from favorites
export const removeFromFavorites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if product is in favorites
    if (
      !user.favorites.some(
        (favId) => favId.toString() === product._id.toString()
      )
    ) {
      res.status(400).json({ message: "Product not in favorites" });
      return;
    }

    // Remove from favorites
    user.favorites = user.favorites.filter(
      (favId) => favId.toString() !== product._id.toString()
    );
    await user.save();

    // Decrement favorites count
    product.favorites = Math.max(0, product.favorites - 1);
    await product.save();

    res.json({ message: "Product removed from favorites" });
  } catch (error) {
    console.error("Remove from favorites error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user's favorite products
export const getFavoriteProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user.id).populate({
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
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Buy a product
export const buyProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { paymentMethod, shippingAddress } = req.body;
    const buyerId = req.user.id;

    // Find product
    const product = await Product.findById(req.params.id);

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
    const orderId = `CASH${moment().format('YYMMDDHHmmss')}${Math.floor(Math.random() * 1000)}`;
    
    const payment = new Payment({
      orderId,
      requestId: orderId,
      amount: product.price,
      productId: product._id,
      buyerId,
      sellerId: product.seller,
      paymentMethod,
      paymentStatus: 'completed',
      shippingAddress: shippingAddress || "Not provided",
      receivedSuccessfullyDeadline: moment().add(7, 'days').toDate(),
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
  } catch (error) {
    console.error("Buy product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Report a product
export const reportProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { reason, description } = req.body;
    const reporterId = req.user.id;

    // Find product
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    } // Check if user is reporting their own product
    if (product.seller.toString() === reporterId) {
      res.status(400).json({ message: "You cannot report your own product" });
      return;
    }

    // Create a report
    const newReport = new Report({
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
  } catch (error) {
    console.error("Report product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN PRODUCT FUNCTIONS

// Get all products (admin)
export const getAllProductsAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    // Build filter object
    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = order === "asc" ? 1 : -1;

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get products with seller info
    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .populate("seller", "name email");

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Admin get all products error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin update product
export const updateProductAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { title, description, price, category, condition, status } = req.body;

    // Find product
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // Update fields
    if (title) product.title = title;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category) product.category = category;
    if (condition) product.condition = condition;
    if (status) product.status = status;

    await product.save();

    res.json({
      message: "Product updated by admin",
      product,
    });
  } catch (error) {
    console.error("Admin update product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin delete product
export const deleteProductAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // Delete images from Cloudinary
    for (const imageUrl of product.images) {
      if (imageUrl.includes("cloudinary")) {
        const publicId = imageUrl.split("/").pop()?.split(".")[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`studenthub/${publicId}`);
        }
      }
    }

    await product.deleteOne();

    res.json({ message: "Product removed by admin" });
  } catch (error) {
    console.error("Admin delete product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get reported products (admin)
export const getReportedProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "pending", // pending, reviewed, dismissed
    } = req.query;

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Find reports for products
    const reports = await Report.find({
      type: "product",
      status: status as string,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("product")
      .populate("reporter", "name email")
      .populate("reported", "name email");

    // Get total count for pagination
    const total = await Report.countDocuments({
      type: "product",
      status: status as string,
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
  } catch (error) {
    console.error("Get reported products error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Approve a product (admin)
export const approveProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const productId = req.params.id;

    // Find product
    const product = await Product.findById(productId);

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
  } catch (error) {
    console.error("Approve product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reject a product (admin)
export const rejectProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const productId = req.params.id;
    const { reason } = req.body;

    // Find product
    const product = await Product.findById(productId);

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
  } catch (error) {
    console.error("Reject product error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get pending products (admin)
export const getPendingProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = order === "asc" ? 1 : -1;

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get pending products with seller info
    const products = await Product.find({ status: "pending" })
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .populate("seller", "name email");

    // Get total count for pagination
    const total = await Product.countDocuments({ status: "pending" });

    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get pending products error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Purchase a product using VNPay
 * @route POST /api/products/:id/purchase
 * @access Private
 */
export const purchaseProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { bankCode, locale, shippingAddress } = req.body;
    const buyerId = req.user.id;

    // Find product
    const product = await Product.findById(id);
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
    const orderId = `VNP${moment(date).format('YYMMDDHHmmss')}`;
    
    // Get client IP address
    const ipAddr = req.headers['x-forwarded-for'] || 
                  req.socket.remoteAddress || 
                  '127.0.0.1';

    // Create payment in database
    const payment = new Payment({
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
    
    const paymentUrl = vnpayService.createPaymentUrl({
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
  } catch (error: any) {
    console.error('Product purchase error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi mua sản phẩm' });
  }
};

/**
 * Update shipping address for a purchase
 * @route PUT /api/products/purchases/:orderId/shipping-address
 * @access Private (Buyer only)
 */
export const updatePurchaseShippingAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { shippingAddress } = req.body;
    const buyerId = req.user.id;

    if (!shippingAddress || !shippingAddress.trim()) {
      res.status(400).json({ message: 'Địa chỉ giao hàng là bắt buộc' });
      return;
    }

    // Find purchase by buyer
    const payment = await Payment.findOne({ 
      orderId, 
      buyerId 
    }).populate('productId');

    if (!payment) {
      res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      return;
    }

    // Check if purchase can be edited (not delivered/received yet)
    if (payment.receivedSuccessfully) {
      res.status(400).json({ message: 'Không thể chỉnh sửa đơn hàng đã nhận hàng' });
      return;
    }

    // Check 6-hour time limit for editing
    const timeDiff = Date.now() - new Date(payment.createdAt).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 6) {
      res.status(400).json({ 
        message: 'Không thể thay đổi địa chỉ giao hàng sau 6 giờ kể từ khi đặt hàng' 
      });
      return;
    }

    // Update shipping address
    payment.shippingAddress = shippingAddress.trim();
    await payment.save();

    res.json({
      message: 'Cập nhật địa chỉ giao hàng thành công',
      purchase: {
        orderId: payment.orderId,
        shippingAddress: payment.shippingAddress,
        updatedAt: payment.updatedAt
      }
    });
  } catch (error) {
    console.error('Update shipping address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add or update purchase notes
 * @route PUT /api/products/purchases/:orderId/notes
 * @access Private (Buyer or Seller)
 */
export const updatePurchaseNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { notes, noteType = 'buyer' } = req.body; // noteType: 'buyer' | 'seller'
    const userId = req.user.id;

    if (!notes || !notes.trim()) {
      res.status(400).json({ message: 'Ghi chú không được để trống' });
      return;
    }

    // Find purchase
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      return;
    }

    // Check if user is buyer or seller
    const isBuyer = payment.buyerId.toString() === userId;
    const isSeller = payment.sellerId.toString() === userId;

    if (!isBuyer && !isSeller) {
      res.status(403).json({ message: 'Không có quyền chỉnh sửa đơn hàng này' });
      return;
    }

    // Determine which notes field to update based on user role
    const actualNoteType = isBuyer ? 'buyer' : 'seller';
    
    // Add notes to extraData (stored as JSON)
    let extraData: any = {};
    try {
      extraData = payment.extraData ? JSON.parse(payment.extraData) : {};
    } catch {
      extraData = {};
    }

    extraData[`${actualNoteType}Notes`] = {
      content: notes.trim(),
      updatedAt: new Date(),
      updatedBy: userId
    };

    payment.extraData = JSON.stringify(extraData);
    await payment.save();

    res.json({
      message: 'Cập nhật ghi chú thành công',
      purchase: {
        orderId: payment.orderId,
        notes: extraData[`${actualNoteType}Notes`],
        updatedAt: payment.updatedAt
      }
    });
  } catch (error) {
    console.error('Update purchase notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Cancel a purchase (before payment completion or within timeframe)
 * @route POST /api/products/purchases/:orderId/cancel
 * @access Private (Buyer only)
 */
export const cancelPurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const buyerId = req.user.id;

    // Find purchase by buyer
    const payment = await Payment.findOne({ 
      orderId, 
      buyerId 
    }).populate('productId');

    if (!payment) {
      res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      return;
    }

    // Check if purchase can be cancelled
    if (payment.paymentStatus === 'failed') {
      res.status(400).json({ message: 'Đơn hàng đã bị hủy trước đó' });
      return;
    }

    if (payment.receivedSuccessfully) {
      res.status(400).json({ message: 'Không thể hủy đơn hàng đã nhận hàng' });
      return;
    }

    // Check time limit for cancellation (6 hours for completed payments)
    if (payment.paymentStatus === 'completed') {
      const timeDiff = Date.now() - new Date(payment.createdAt).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff > 6) {
        res.status(400).json({ 
          message: 'Không thể hủy đơn hàng sau 6 giờ kể từ khi đặt hàng' 
        });
        return;
      }
    }

    // Update payment status to failed and add cancellation reason
    payment.paymentStatus = 'failed';
    payment.errorMessage = `Cancelled by buyer: ${reason || 'No reason provided'}`;
    
    // Add cancellation info to extraData
    let extraData: any = {};
    try {
      extraData = payment.extraData ? JSON.parse(payment.extraData) : {};
    } catch {
      extraData = {};
    }

    extraData.cancellation = {
      cancelledBy: buyerId,
      reason: reason || 'No reason provided',
      cancelledAt: new Date()
    };

    payment.extraData = JSON.stringify(extraData);
    await payment.save();

    // Update product status back to available if it was sold
    const product = await Product.findById(payment.productId);
    if (product && product.status === 'sold') {
      product.status = 'available';
      product.buyer = undefined;
      await product.save();
    }

    res.json({
      message: 'Hủy đơn hàng thành công',
      purchase: {
        orderId: payment.orderId,
        paymentStatus: payment.paymentStatus,
        cancellationReason: reason || 'No reason provided',
        cancelledAt: new Date()
      }
    });
  } catch (error) {
    console.error('Cancel purchase error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get detailed purchase information for editing
 * @route GET /api/products/purchases/:orderId/details
 * @access Private (Buyer or Seller)
 */
export const getPurchaseDetailsForEdit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({ orderId })
      .populate({
        path: 'productId',
        populate: {
          path: 'seller',
          select: 'name email avatar'
        }
      })
      .populate('buyerId', 'name email avatar')
      .populate('sellerId', 'name email avatar');

    if (!payment) {
      res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      return;
    }

    // Check if user is buyer or seller
    const isBuyer = (payment.buyerId as any)._id.toString() === userId;
    const isSeller = (payment.sellerId as any)._id.toString() === userId;

    if (!isBuyer && !isSeller) {
      res.status(403).json({ message: 'Không có quyền xem đơn hàng này' });
      return;
    }

    // Parse extraData for notes
    let extraData: any = {};
    try {
      extraData = payment.extraData ? JSON.parse(payment.extraData) : {};
    } catch {
      extraData = {};
    }

    // Determine what can be edited based on current status, user role, and time limits
    const timeDiff = Date.now() - new Date(payment.createdAt).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    const isWithin6Hours = hoursDiff <= 6;
    const timeRemainingMs = Math.max(0, (6 * 60 * 60 * 1000) - timeDiff);
    
    const canEditShipping = isBuyer && !payment.receivedSuccessfully && isWithin6Hours;
    const canCancel = isBuyer && 
      payment.paymentStatus !== 'failed' && 
      !payment.receivedSuccessfully &&
      isWithin6Hours;
    const canAddNotes = true; // Both buyer and seller can always add notes

    const purchaseDetails = {
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      shippingAddress: payment.shippingAddress,
      purchaseDate: payment.createdAt,
      updatedAt: payment.updatedAt,
      receivedSuccessfully: payment.receivedSuccessfully,
      receivedSuccessfullyDeadline: payment.receivedSuccessfullyDeadline,
      receivedConfirmedAt: payment.receivedConfirmedAt,
      product: payment.productId,
      buyer: payment.buyerId,
      seller: payment.sellerId,
      buyerNotes: extraData.buyerNotes || null,
      sellerNotes: extraData.sellerNotes || null,
      cancellation: extraData.cancellation || null,
      timeInfo: {
        hoursSinceOrder: hoursDiff,
        isWithin6Hours,
        timeRemainingMs,
        editDeadline: new Date(new Date(payment.createdAt).getTime() + (6 * 60 * 60 * 1000))
      },
      permissions: {
        canEditShipping,
        canCancel,
        canAddNotes,
        userRole: isBuyer ? 'buyer' : 'seller'
      }
    };

    res.json({
      success: true,
      purchase: purchaseDetails
    });
  } catch (error) {
    console.error('Get purchase details for edit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
