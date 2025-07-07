import crypto from 'crypto';
import moment from 'moment';
import qs from 'qs';
import { vnpayConfig } from '../config/vnpay';

interface VNPayParams {
  amount: number;
  orderId?: string;
  orderInfo?: string;
  bankCode?: string;
  locale?: string;
  ipAddr: string;
  returnUrl?: string;
}

export const vnpayService = {
  /**
   * Create a payment URL for redirecting users to VNPay payment gateway
   */
  createPaymentUrl: (params: VNPayParams): string => {
    // Set timezone to Vietnam
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    
    // Generate order ID if not provided
    const orderId = params.orderId || moment(date).format('DDHHmmss');
    const amount = params.amount;
    const orderInfo = params.orderInfo || 'Thanh toan cho ma GD:' + orderId;
    const locale = params.locale || 'vn';
    const currCode = 'VND';
    const returnUrl = params.returnUrl || vnpayConfig.vnp_ReturnUrl;
    
    // Create payment params
    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: vnpayConfig.vnp_TmnCode || '',
      vnp_Locale: locale,
      vnp_CurrCode: currCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: amount * 100, // Convert to smallest currency unit (cents)
      vnp_ReturnUrl: returnUrl || '',
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: createDate,
    };
    
    // Add bank code if provided
    if (params.bankCode) {
      vnpParams['vnp_BankCode'] = params.bankCode;
    }

    // Sort params alphabetically
    const sortedParams = sortObject(vnpParams);
    
    // Generate secure hash
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret || '');
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    sortedParams['vnp_SecureHash'] = signed;
    
    // Return full URL with query string
    return vnpayConfig.vnp_Url + '?' + qs.stringify(sortedParams, { encode: false });
  },
  
  /**
   * Verify VNPay return request
   */
  verifyReturnUrl: (vnpParams: Record<string, string>): boolean => {
    // Get secure hash from params
    const secureHash = vnpParams['vnp_SecureHash'];
    
    // Remove secure hash from params
    const clonedParams = { ...vnpParams };
    delete clonedParams['vnp_SecureHash'];
    delete clonedParams['vnp_SecureHashType'];
    
    // Sort params alphabetically
    const sortedParams = sortObject(clonedParams);
    
    // Generate secure hash
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret || '');
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    
    // Compare generated hash with received hash
    return secureHash === signed;
  },
  
  /**
   * Query transaction status
   */
  queryTransaction: async (orderId: string, transactionDate: string) => {
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    const date = new Date();
    const vnp_RequestId = moment(date).format('HHmmss');
    const vnp_Version = '2.1.0';
    const vnp_Command = 'querydr';
    const vnp_TmnCode = vnpayConfig.vnp_TmnCode;
    const vnp_TxnRef = orderId;
    const vnp_OrderInfo = 'Truy van GD ma:' + vnp_TxnRef;
    const vnp_TransactionDate = transactionDate;
    const vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
    const vnp_IpAddr = '127.0.0.1'; // Should be dynamically set in controller
    
    // Create signature data
    const data = `${vnp_RequestId}|${vnp_Version}|${vnp_Command}|${vnp_TmnCode}|${vnp_TxnRef}|${vnp_TransactionDate}|${vnp_CreateDate}|${vnp_IpAddr}|${vnp_OrderInfo}`;
    
    const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret || '');
    const vnp_SecureHash = hmac.update(Buffer.from(data, 'utf-8')).digest("hex");
    
    // Create request body
    const requestBody = {
      vnp_RequestId,
      vnp_Version,
      vnp_Command,
      vnp_TmnCode,
      vnp_TxnRef,
      vnp_OrderInfo,
      vnp_TransactionDate,
      vnp_CreateDate,
      vnp_IpAddr,
      vnp_SecureHash
    };
    
    // Use fetch for making the API request
    try {
      const response = await fetch(vnpayConfig.vnp_Api || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      return await response.json();
    } catch (error) {
      throw new Error(`Error querying VNPay transaction: ${error}`);
    }
  },
  
  /**
   * Process refund transaction
   */
  refundTransaction: async (params: {
    orderId: string,
    transactionDate: string,
    amount: number,
    transactionType: string,
    user: string
  }) => {
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    const date = new Date();
    
    const vnp_RequestId = moment(date).format('HHmmss');
    const vnp_Version = '2.1.0';
    const vnp_Command = 'refund';
    const vnp_TmnCode = vnpayConfig.vnp_TmnCode;
    const vnp_TransactionType = params.transactionType;
    const vnp_TxnRef = params.orderId;
    const vnp_Amount = params.amount * 100;
    const vnp_TransactionNo = '0';
    const vnp_TransactionDate = params.transactionDate;
    const vnp_CreateBy = params.user;
    const vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
    const vnp_IpAddr = '127.0.0.1'; // Should be dynamically set in controller
    const vnp_OrderInfo = 'Hoan tien GD ma:' + vnp_TxnRef;
    
    // Create signature data
    const data = `${vnp_RequestId}|${vnp_Version}|${vnp_Command}|${vnp_TmnCode}|${vnp_TransactionType}|${vnp_TxnRef}|${vnp_Amount}|${vnp_TransactionNo}|${vnp_TransactionDate}|${vnp_CreateBy}|${vnp_CreateDate}|${vnp_IpAddr}|${vnp_OrderInfo}`;
    
    const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret || '');
    const vnp_SecureHash = hmac.update(Buffer.from(data, 'utf-8')).digest("hex");
    
    // Create request body
    const requestBody = {
      vnp_RequestId,
      vnp_Version,
      vnp_Command,
      vnp_TmnCode,
      vnp_TransactionType,
      vnp_TxnRef,
      vnp_Amount,
      vnp_TransactionNo,
      vnp_OrderInfo,
      vnp_TransactionDate,
      vnp_CreateBy,
      vnp_CreateDate,
      vnp_IpAddr,
      vnp_SecureHash
    };
    
    // Use fetch for making the API request
    try {
      const response = await fetch(vnpayConfig.vnp_Api || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      return await response.json();
    } catch (error) {
      throw new Error(`Error processing VNPay refund: ${error}`);
    }
  }
};

/**
 * Sort object by key
 */
function sortObject(obj: Record<string, any>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      sorted[key] = JSON.stringify(sortObject(obj[key]));
    } else {
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
    }
  }
  
  return sorted;
} 