import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { createMomoPayment, processMomoIPN, verifyPaymentStatus } from '../services/momoService';
import { vnpayService } from '../services/vnpayService';
import Product from '../models/Product';
import Payment from '../models/Payment';
import moment from 'moment';

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

    const { productId, bankCode, locale } = req.body;
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
    
    const payment = await Payment.findOne({ orderId });
    
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }
    
    if (responseCode === '00' && transactionStatus === '00') {
      payment.paymentStatus = 'completed';
      payment.transactionId = transactionId;
      await payment.save();

      res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`);
    } else {
      payment.paymentStatus = 'failed';
      payment.errorCode = responseCode;
      payment.errorMessage = `Transaction failed with code ${responseCode}`;
      await payment.save();
      
      res.redirect(`${process.env.CLIENT_URL}/payment/failed?orderId=${orderId}&code=${responseCode}`);
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
      await payment.save();
      
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