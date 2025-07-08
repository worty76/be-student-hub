import { Request, Response } from 'express';
import Product from '../models/Product';
import Payment from '../models/Payment';
import mongoose from 'mongoose';

// Get statistics on product sales
export const getProductSalesStats = async (req: Request, res: Response) => {
  try {
    // Get query parameters for filtering
    const { startDate, endDate, category } = req.query;
    
    // Build match conditions for aggregation
    let matchConditions: any = {
      paymentStatus: 'completed'
    };
    
    // Add date range filter if provided
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        matchConditions.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        matchConditions.createdAt.$lte = new Date(endDate as string);
      }
    }
    
    // Get payments with populated product data
    const payments = await Payment.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);
    
    // Filter by category if provided
    let filteredPayments = payments;
    if (category) {
      filteredPayments = payments.filter(payment => payment.product.category === category);
    }
    
    // Calculate total sales
    const totalSales = filteredPayments.length;
    const totalRevenue = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Group by category
    const categorySales = filteredPayments.reduce((acc: Record<string, any>, payment) => {
      const category = payment.product.category;
      if (!acc[category]) {
        acc[category] = { count: 0, revenue: 0 };
      }
      acc[category].count += 1;
      acc[category].revenue += payment.amount;
      return acc;
    }, {});
    
    // Get most sold products
    const productSales = filteredPayments.reduce((acc: Record<string, any>, payment) => {
      const productId = payment.product._id.toString();
      if (!acc[productId]) {
        acc[productId] = {
          id: productId,
          title: payment.product.title,
          count: 0,
          revenue: 0
        };
      }
      acc[productId].count += 1;
      acc[productId].revenue += payment.amount;
      return acc;
    }, {});
    
    // Convert to array and sort by count
    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);
    
    return res.status(200).json({
      totalSales,
      totalRevenue,
      categorySales,
      topProducts
    });
  } catch (error) {
    console.error('Error getting product sales stats:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get monthly sales data for charts
export const getMonthlySalesData = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    
    const monthlySales = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: {
            $gte: new Date(`${targetYear}-01-01`),
            $lte: new Date(`${targetYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Fill in missing months with zero values
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const foundMonth = monthlySales.find(item => item._id === month);
      return {
        month,
        count: foundMonth ? foundMonth.count : 0,
        revenue: foundMonth ? foundMonth.revenue : 0
      };
    });
    
    return res.status(200).json(monthlyData);
  } catch (error) {
    console.error('Error getting monthly sales data:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get admin profit statistics
export const getAdminProfits = async (req: Request, res: Response) => {
  try {
    // Get query parameters for filtering
    const { startDate, endDate } = req.query;
    
    // Build match conditions for aggregation
    let matchConditions: any = {
      paymentStatus: 'completed'
    };
    
    // Add date range filter if provided
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        matchConditions.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        matchConditions.createdAt.$lte = new Date(endDate as string);
      }
    }
    
    // Get completed payments with admin commission
    const payments = await Payment.find(matchConditions);
    
    // Calculate total admin profits
    const totalProfit = payments.reduce((sum, payment) => sum + payment.adminCommission, 0);
    const totalTransactions = payments.length;
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const averageCommissionRate = payments.length > 0 
      ? payments.reduce((sum, payment) => sum + payment.adminCommissionRate, 0) / payments.length 
      : 0;
    
    // Group profits by month for trend analysis
    const monthlyProfits = payments.reduce((acc: Record<string, any>, payment) => {
      const monthKey = payment.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          profit: 0,
          transactions: 0,
          revenue: 0
        };
      }
      acc[monthKey].profit += payment.adminCommission;
      acc[monthKey].transactions += 1;
      acc[monthKey].revenue += payment.amount;
      return acc;
    }, {});
    
    // Convert to array and sort by month
    const monthlyData = Object.values(monthlyProfits).sort((a: any, b: any) => 
      a.month.localeCompare(b.month)
    );
    
    // Get profits by payment method
    const profitsByMethod = payments.reduce((acc: Record<string, any>, payment) => {
      const method = payment.paymentMethod;
      if (!acc[method]) {
        acc[method] = {
          profit: 0,
          transactions: 0,
          revenue: 0
        };
      }
      acc[method].profit += payment.adminCommission;
      acc[method].transactions += 1;
      acc[method].revenue += payment.amount;
      return acc;
    }, {});
    
    return res.status(200).json({
      totalProfit,
      totalTransactions,
      totalRevenue,
      averageCommissionRate,
      monthlyProfits: monthlyData,
      profitsByPaymentMethod: profitsByMethod
    });
  } catch (error) {
    console.error('Error getting admin profits:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get monthly admin profit data for charts
export const getMonthlyAdminProfits = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    
    const monthlyProfits = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: {
            $gte: new Date(`${targetYear}-01-01`),
            $lte: new Date(`${targetYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          profit: { $sum: '$adminCommission' },
          transactions: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Fill in missing months with zero values
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const foundMonth = monthlyProfits.find(item => item._id === month);
      return {
        month,
        profit: foundMonth ? foundMonth.profit : 0,
        transactions: foundMonth ? foundMonth.transactions : 0,
        revenue: foundMonth ? foundMonth.revenue : 0
      };
    });
    
    return res.status(200).json(monthlyData);
  } catch (error) {
    console.error('Error getting monthly admin profits:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};