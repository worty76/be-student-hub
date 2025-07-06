import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  CLIENT_URL: string;
  NODE_ENV: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  // MoMo Payment Configuration
  MOMO_PARTNER_CODE: string;
  MOMO_ACCESS_KEY: string;
  MOMO_SECRET_KEY: string;
  MOMO_ENDPOINT: string;
  MOMO_REDIRECT_URL: string;
  MOMO_IPN_URL: string;
}

const config: Config = {
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/studenthub',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  // MoMo Payment Configuration
  MOMO_PARTNER_CODE: process.env.MOMO_PARTNER_CODE || '',
  MOMO_ACCESS_KEY: process.env.MOMO_ACCESS_KEY || '',
  MOMO_SECRET_KEY: process.env.MOMO_SECRET_KEY || '',
  MOMO_ENDPOINT: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
  MOMO_REDIRECT_URL: process.env.MOMO_REDIRECT_URL || `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/result`,
  MOMO_IPN_URL: process.env.MOMO_IPN_URL || `${process.env.CLIENT_URL?.replace('3000', '5000') || 'http://localhost:5000'}/api/payments/momo/ipn`,
};

export default config; 