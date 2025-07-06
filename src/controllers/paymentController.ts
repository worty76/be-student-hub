import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { createMomoPayment, processMomoIPN, verifyPaymentStatus } from '../services/momoService';
import Product from '../models/Product';
import Payment from '../models/Payment';

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
 * Get payment status
 * @route GET /api/payments/:orderId/status
 * @access Private
 */
export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    
    // Verify payment status
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
 * Get user payment history
 * @route GET /api/payments/history
 * @access Private
 */
export const getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    
    // Get payments where user is either buyer or seller
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