import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { createMomoPayment, processMomoIPN, verifyPaymentStatus } from '../services/momoService';
import { vnpayService } from '../services/vnpayService';
import Product from '../models/Product';
import Payment from '../models/Payment';
import moment from 'moment';
import SchedulerService from '../services/schedulerService';

/**
 * Create a MoMo payment for a product
 * @route POST /api/payments/momo/create
 * @access Private
 */
export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { productId } = req.body;
    const buyerId = req.user.id;

    // Find product
    const product = await Product.findById(productId);
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

    // Create MoMo payment request
    const paymentResponse = await createMomoPayment({
      productId: product._id.toString(),
      buyerId,
      sellerId: product.seller.toString(),
      amount: product.price,
      orderInfo: `Payment for ${product.title}`,
    });

    // Return payment URL
    res.status(200).json({
      success: true,
      payUrl: paymentResponse.payUrl,
      orderId: paymentResponse.orderId,
    });
  } catch (error: any) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi tạo thanh toán' });
  }
};

/**
 * Create a VNPay payment for a product
 * @route POST /api/payments/vnpay/create
 * @access Private
 */
export const createVNPayPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { productId, bankCode, locale, shippingAddress } = req.body;
    const buyerId = req.user.id;

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: 'Sản phẩm không tồn tại' });
      return;
    }

    if (product.status !== 'available') {
      res.status(400).json({ message: 'Sản phẩm không khả dụng' });
      return;
    }

    if (product.seller.toString() === buyerId) {
      res.status(400).json({ message: 'Bạn không thể mua sản phẩm của chính mình' });
      return;
    }

    // Check if shipping address is provided
    if (!shippingAddress) {
      res.status(400).json({ message: 'Địa chỉ giao hàng là bắt buộc' });
      return;
    }

    const date = new Date();
    const orderId = `VNP${moment(date).format('YYMMDDHHmmss')}`;
    
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
      orderInfo: `Payment for ${product.title}`,
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
    });
  } catch (error: any) {
    console.error('Create VNPay payment error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi tạo thanh toán VNPay' });
  }
};

/**
 * Process MoMo IPN (Instant Payment Notification)
 * @route POST /api/payments/momo/ipn
 * @access Public
 */
export const handleMomoIPN = async (req: Request, res: Response): Promise<void> => {
  try {
    const ipnData = req.body;
    
    // Process IPN data
    const result = await processMomoIPN(ipnData);
    
    // Return response to MoMo
    res.status(200).json(result);
  } catch (error: any) {
    console.error('MoMo IPN error:', error);
    res.status(500).json({ 
      message: error.message || 'Lỗi khi xử lý thanh toán',
      resultCode: 1
    });
  }
};

/**
 * Process VNPay Return URL
 * @route GET /api/payments/vnpay/return
 * @access Public
 */
export const handleVNPayReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const vnpParams = req.query;
    
    const isValidSignature = vnpayService.verifyReturnUrl(vnpParams as Record<string, string>);
    
    if (!isValidSignature) {
      res.status(400).json({ message: 'Invalid signature' });
      return;
    }
    
    const orderId = vnpParams.vnp_TxnRef as string;
    const transactionId = vnpParams.vnp_TransactionNo as string;
    const responseCode = vnpParams.vnp_ResponseCode as string;
    const transactionStatus = vnpParams.vnp_TransactionStatus as string;
    
    const payment = await Payment.findOne({ orderId })
      .populate('productId')
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email');
    
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }
    
    if (responseCode === '00' && transactionStatus === '00') {
      // Update payment status
      payment.paymentStatus = 'completed';
      payment.transactionId = transactionId;
      await payment.save();

      // Update product status to sold
      const product = await Product.findByIdAndUpdate(
        payment.productId,
        { 
          status: 'sold',
          buyer: payment.buyerId 
        },
        { new: true }
      );

      if (!product) {
        res.status(404).json({ message: 'Product not found' });
        return;
      }

      // Create transaction object for response
      const transaction = {
        buyer: payment.buyerId,
        seller: payment.sellerId,
        product: payment.productId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        shippingAddress: payment.shippingAddress || '',
        date: new Date().toISOString()
      };

      res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`);
    } else {
      payment.paymentStatus = 'failed';
      payment.errorCode = responseCode;
      payment.errorMessage = `Transaction failed with code ${responseCode}`;
      await payment.save();
      
      // Redirect to frontend failure page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/payment/failed?orderId=${orderId}&code=${responseCode}&message=${encodeURIComponent(`Transaction failed with code ${responseCode}`)}`;
      
      res.redirect(302, redirectUrl);
    }
  } catch (error: any) {
    console.error('VNPay Return error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi xử lý kết quả thanh toán' });
  }
};

/**
 * Process VNPay IPN
 * @route POST /api/payments/vnpay/ipn
 * @access Public
 */
export const handleVNPayIPN = async (req: Request, res: Response): Promise<void> => {
  try {
    const vnpParams = req.query;
    
    const isValidSignature = vnpayService.verifyReturnUrl(vnpParams as Record<string, string>);
    
    if (!isValidSignature) {
      res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
      return;
    }
    
    const orderId = vnpParams.vnp_TxnRef as string;
    const responseCode = vnpParams.vnp_ResponseCode as string;
    
    const payment = await Payment.findOne({ orderId });
    
    if (!payment) {
      res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      return;
    }
    
    const vnpAmount = parseInt(vnpParams.vnp_Amount as string, 10) / 100;
    if (vnpAmount !== payment.amount) {
      res.status(200).json({ RspCode: '04', Message: 'Amount invalid' });
      return;
    }
    
    if (payment.paymentStatus !== 'pending') {
      res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' });
      return;
    }
    
    if (responseCode === '00') {
      payment.paymentStatus = 'completed';
      payment.transactionId = vnpParams.vnp_TransactionNo as string;
      // Set 7-day deadline for receipt confirmation
      payment.receivedSuccessfullyDeadline = moment().add(7, 'days').toDate();
      await payment.save();
      
      // Update product status to sold
      await Product.findByIdAndUpdate(
        payment.productId,
        { 
          status: 'sold',
          buyer: payment.buyerId 
        }
      );
      
      res.status(200).json({ RspCode: '00', Message: 'Success' });
    } else {
      payment.paymentStatus = 'failed';
      payment.errorCode = responseCode;
      payment.errorMessage = `Transaction failed with code ${responseCode}`;
      await payment.save();
      
      res.status(200).json({ RspCode: '00', Message: 'Success' });
    }
  } catch (error: any) {
    console.error('VNPay IPN error:', error);
    res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

/**
 * Get payment status
 * @route GET /api/payments/:orderId/status
 * @access Private
 */
export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    
    const payment = await verifyPaymentStatus(orderId);
    
    res.status(200).json({
      success: true,
      payment
    });
  } catch (error: any) {
    console.error('Get payment status error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi lấy trạng thái thanh toán' });
  }
};

/**
 * Query VNPay transaction status
 * @route POST /api/payments/vnpay/query
 * @access Private
 */
export const queryVNPayTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, transactionDate } = req.body;
    
    if (!orderId || !transactionDate) {
      res.status(400).json({ message: 'Order ID and transaction date are required' });
      return;
    }
    
    const result = await vnpayService.queryTransaction(orderId, transactionDate);
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error('Query VNPay transaction error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi truy vấn giao dịch' });
  }
};

/**
 * Request refund for VNPay transaction
 * @route POST /api/payments/vnpay/refund
 * @access Private (Admin only)
 */
export const refundVNPayTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, transactionDate, amount, transactionType } = req.body;
    const user = req.user.name || req.user.email || req.user.id;
    
    if (!orderId || !transactionDate || !amount || !transactionType) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }
    
    const result = await vnpayService.refundTransaction({
      orderId,
      transactionDate,
      amount,
      transactionType,
      user
    });
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error('Refund VNPay transaction error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi hoàn tiền giao dịch' });
  }
};

/**
 * Get user payment history
 * @route GET /api/payments/history
 * @access Private
 */
export const getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    
    const payments = await Payment.find({
      $or: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    })
      .populate('productId', 'title images price')
      .populate('buyerId', 'name avatar')
      .populate('sellerId', 'name avatar')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      payments,
    });
  } catch (error: any) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi lấy lịch sử thanh toán' });
  }
};

/**
 * Get payment success details by orderId
 * @route GET /api/payments/:orderId/success
 * @access Public
 */
export const getPaymentSuccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    
    const payment = await Payment.findOne({ orderId })
      .populate('productId')
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email');
    
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }
    
    if (payment.paymentStatus !== 'completed') {
      res.status(400).json({ message: 'Payment not completed' });
      return;
    }
    
    const product = await Product.findById(payment.productId);
    
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    
    // Create transaction object for response
    const transaction = {
      buyer: payment.buyerId,
      seller: payment.sellerId,
      product: payment.productId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      shippingAddress: payment.shippingAddress || '',
      date: payment.updatedAt.toISOString()
    };
    
    // Return success response
    res.status(200).json({
      message: 'Product purchased successfully',
      product: product,
      transaction: transaction
    });
  } catch (error: any) {
    console.error('Get payment success error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi lấy thông tin thanh toán thành công' });
  }
};

/**
 * Get user purchase history (only items the user bought)
 * @route GET /api/payments/purchases
 * @access Private
 */
export const getUserPurchaseHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 10, 
      status = 'completed', 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      category,
      minAmount,
      maxAmount,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter: any = {
      buyerId: userId,
    };

    // Add status filter - exclude failed/canceled purchases by default
    if (status && status !== 'all') {
      filter.paymentStatus = status;
    } else if (!status || status === 'completed') {
      // Explicitly exclude failed/canceled purchases by default
      filter.paymentStatus = { $ne: 'failed' };
    }

    // Add amount range filter
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    // Add date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get purchases with population
    const purchases = await Payment.find(filter)
      .populate({
        path: 'productId',
        select: 'title description price images category condition status location seller createdAt',
        populate: {
          path: 'seller',
          select: 'name email avatar'
        }
      })
      .populate('sellerId', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Apply category filter on populated products (if specified)
    let filteredPurchases = purchases;
    if (category) {
      filteredPurchases = purchases.filter(purchase => 
        purchase.productId && (purchase.productId as any).category === category
      );
    }

    // Get total count for pagination
    const totalPurchases = await Payment.countDocuments(filter);

    // Calculate statistics
    const stats = await Payment.aggregate([
      { $match: { buyerId: userId, paymentStatus: 'completed' } },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
          totalPurchases: { $sum: 1 },
          averageOrderValue: { $avg: '$amount' }
        }
      }
    ]);

    // Format the response
    const formattedPurchases = filteredPurchases.map(purchase => ({
      orderId: purchase.orderId,
      transactionId: purchase.transactionId,
      amount: purchase.amount,
      paymentMethod: purchase.paymentMethod,
      paymentStatus: purchase.paymentStatus,
      shippingAddress: purchase.shippingAddress,
      purchaseDate: purchase.createdAt,
      receivedSuccessfully: purchase.receivedSuccessfully,
      receivedSuccessfullyDeadline: purchase.receivedSuccessfullyDeadline,
      receivedConfirmedAt: purchase.receivedConfirmedAt,
      product: purchase.productId ? {
        _id: (purchase.productId as any)._id,
        title: (purchase.productId as any).title,
        description: (purchase.productId as any).description,
        price: (purchase.productId as any).price,
        images: (purchase.productId as any).images,
        category: (purchase.productId as any).category,
        condition: (purchase.productId as any).condition,
        status: (purchase.productId as any).status,
        location: (purchase.productId as any).location,
        seller: (purchase.productId as any).seller
      } : null
    }));

    res.status(200).json({
      success: true,
      data: {
        purchases: formattedPurchases,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalPurchases / limitNum),
          totalItems: totalPurchases,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < Math.ceil(totalPurchases / limitNum),
          hasPrevPage: pageNum > 1
        },
        statistics: stats.length > 0 ? {
          totalSpent: stats[0].totalSpent,
          totalPurchases: stats[0].totalPurchases,
          averageOrderValue: Math.round(stats[0].averageOrderValue)
        } : {
          totalSpent: 0,
          totalPurchases: 0,
          averageOrderValue: 0
        }
      }
    });
  } catch (error: any) {
    console.error('Get user purchase history error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Lỗi khi lấy lịch sử mua hàng' 
    });
  }
};

/**
 * Get detailed purchase information by purchase ID
 * @route GET /api/payments/purchases/:orderId
 * @access Private
 */
export const getPurchaseDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const purchase = await Payment.findOne({ 
      orderId, 
      buyerId: userId 
    })
      .populate({
        path: 'productId',
        populate: {
          path: 'seller',
          select: 'name email avatar phone'
        }
      })
      .populate('sellerId', 'name email avatar phone')
      .lean();

    if (!purchase) {
      res.status(404).json({ 
        success: false,
        message: 'Purchase not found' 
      });
      return;
    }

    // Format detailed response
    const detailedPurchase = {
      orderId: purchase.orderId,
      transactionId: purchase.transactionId,
      amount: purchase.amount,
      paymentMethod: purchase.paymentMethod,
      paymentStatus: purchase.paymentStatus,
      shippingAddress: purchase.shippingAddress,
      purchaseDate: purchase.createdAt,
      updatedAt: purchase.updatedAt,
      receivedSuccessfully: purchase.receivedSuccessfully,
      receivedSuccessfullyDeadline: purchase.receivedSuccessfullyDeadline,
      receivedConfirmedAt: purchase.receivedConfirmedAt,
      product: purchase.productId,
      seller: purchase.sellerId,
      timeline: [
        {
          status: 'pending',
          date: purchase.createdAt,
          description: 'Payment initiated'
        },
        ...(purchase.paymentStatus === 'completed' ? [{
          status: 'completed',
          date: purchase.updatedAt,
          description: 'Payment completed successfully'
        }] : []),
        ...(purchase.receivedSuccessfully ? [{
          status: 'received',
          date: purchase.receivedConfirmedAt,
          description: purchase.receivedConfirmedAt && purchase.receivedSuccessfullyDeadline && purchase.receivedConfirmedAt <= purchase.receivedSuccessfullyDeadline 
            ? 'Receipt confirmed by buyer' 
            : 'Receipt auto-confirmed after 7 days'
        }] : []),
        ...(purchase.paymentStatus === 'failed' ? [{
          status: 'failed',
          date: purchase.updatedAt,
          description: `Payment failed: ${purchase.errorMessage || 'Unknown error'}`
        }] : [])
      ]
    };

    res.status(200).json({
      success: true,
      data: detailedPurchase
    });
  } catch (error: any) {
    console.error('Get purchase details error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết mua hàng' 
    });
  }
};

/**
 * Confirm receipt of purchased product
 * @route POST /api/payments/confirm-receipt/:orderId
 * @access Private
 */
export const confirmReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const buyerId = req.user.id;

    const schedulerService = SchedulerService.getInstance();
    const result = await schedulerService.confirmReceipt(orderId, buyerId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          orderId: result.payment.orderId,
          receivedSuccessfully: result.payment.receivedSuccessfully,
          receivedConfirmedAt: result.payment.receivedConfirmedAt
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    console.error('Confirm receipt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xác nhận đã nhận hàng'
    });
  }
};