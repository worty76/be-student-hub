import cron from 'node-cron';
import moment from 'moment';
import Payment from '../models/Payment';

class SchedulerService {
  private static instance: SchedulerService;

  private constructor() {}

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Initialize all scheduled tasks
   */
  public init(): void {
    console.log('Initializing scheduler service...');
    this.startAutoConfirmReceiptTask();
  }

  /**
   * Auto-confirm receipt for payments that have passed their deadline
   * Runs every hour
   */
  private startAutoConfirmReceiptTask(): void {
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('Running auto-confirm receipt task...');
        await this.autoConfirmExpiredReceipts();
      } catch (error) {
        console.error('Error in auto-confirm receipt task:', error);
      }
    });

    console.log('Auto-confirm receipt task scheduled (runs every hour)');
  }

  /**
   * Auto-confirm receipts for payments that have passed their deadline
   */
  private async autoConfirmExpiredReceipts(): Promise<void> {
    try {
      const now = new Date();
      
      // Find payments that:
      // 1. Are completed
      // 2. Have not been confirmed as received
      // 3. Have a deadline that has passed
      const expiredPayments = await Payment.find({
        paymentStatus: 'completed',
        receivedSuccessfully: false,
        receivedSuccessfullyDeadline: { $lte: now }
      }).populate('productId').populate('buyerId', 'name email');

      if (expiredPayments.length === 0) {
        console.log('No expired payments to auto-confirm');
        return;
      }

      console.log(`Found ${expiredPayments.length} payments to auto-confirm`);

      // Update all expired payments
      const updateResult = await Payment.updateMany(
        {
          paymentStatus: 'completed',
          receivedSuccessfully: false,
          receivedSuccessfullyDeadline: { $lte: now }
        },
        {
          $set: {
            receivedSuccessfully: true,
            receivedConfirmedAt: now
          }
        }
      );

      console.log(`Auto-confirmed ${updateResult.modifiedCount} receipts`);

      // Log each auto-confirmed payment for audit purposes
      for (const payment of expiredPayments) {
        console.log(`Auto-confirmed receipt for order ${payment.orderId} (buyer: ${(payment.buyerId as any)?.name})`);
      }

    } catch (error) {
      console.error('Error in autoConfirmExpiredReceipts:', error);
      throw error;
    }
  }

  /**
   * Manually confirm receipt for a specific payment
   */
  public async confirmReceipt(orderId: string, buyerId: string): Promise<{ success: boolean; message: string; payment?: any }> {
    try {
      const payment = await Payment.findOne({ orderId, buyerId });

      if (!payment) {
        return {
          success: false,
          message: 'Payment not found'
        };
      }

      if (payment.paymentStatus !== 'completed') {
        return {
          success: false,
          message: 'Payment is not completed yet'
        };
      }

      if (payment.receivedSuccessfully) {
        return {
          success: false,
          message: 'Receipt has already been confirmed'
        };
      }

      // Update payment
      payment.receivedSuccessfully = true;
      payment.receivedConfirmedAt = new Date();
      await payment.save();

      console.log(`Receipt manually confirmed for order ${orderId} by buyer ${buyerId}`);

      return {
        success: true,
        message: 'Receipt confirmed successfully',
        payment: payment
      };

    } catch (error) {
      console.error('Error in confirmReceipt:', error);
      return {
        success: false,
        message: 'An error occurred while confirming receipt'
      };
    }
  }

  /**
   * Set receipt deadline for a payment (7 days from completion)
   */
  public async setReceiptDeadline(paymentId: string): Promise<void> {
    try {
      const deadline = moment().add(7, 'days').toDate();
      
      await Payment.findByIdAndUpdate(paymentId, {
        receivedSuccessfullyDeadline: deadline
      });

      console.log(`Set receipt deadline for payment ${paymentId}: ${deadline}`);
    } catch (error) {
      console.error('Error setting receipt deadline:', error);
      throw error;
    }
  }
}

export default SchedulerService; 