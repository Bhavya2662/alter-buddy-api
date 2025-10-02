import { SessionPackage } from '../model/session-package.model';
import { User } from '../model/user.model';
import { Mentor } from '../model/mentor.model';
import { PaymentNotificationService } from './payment-notification.service';
import mongoose from 'mongoose';

export interface PackagePaymentData {
  userId: string;
  mentorId: string;
  packageId: string;
  sessionType: 'chat' | 'audio' | 'video';
  totalAmount: number;
  sessionNumber: number; // Which session in the package (1-based)
  totalSessions: number;
}

export class PackagePaymentService {
  /**
   * Process payment for package sessions
   * - First session: Full package payment
   * - Subsequent sessions: No charge (already paid)
   * - Last session: Activate chat support
   */
  public static async processPackageSessionPayment(
    paymentData: PackagePaymentData,
    transactionId?: string
  ): Promise<{
    success: boolean;
    message: string;
    amount: number;
    paymentRequired: boolean;
    chatSupportActivated?: boolean;
  }> {
    try {
      const { userId, mentorId, packageId, sessionNumber, totalSessions, totalAmount } = paymentData;

      // Get package details
      const packageDoc = await SessionPackage.findById(packageId)
        .populate('userId', 'name email')
        .populate('mentorId', 'name contact')
        .populate('categoryId', 'name');

      if (!packageDoc) {
        return {
          success: false,
          message: 'Package not found',
          amount: 0,
          paymentRequired: false
        };
      }

      // Verify package ownership
      if (packageDoc.userId?.toString() !== userId || packageDoc.mentorId?.toString() !== mentorId) {
        return {
          success: false,
          message: 'Unauthorized access to package',
          amount: 0,
          paymentRequired: false
        };
      }

      // Check if package has remaining sessions
      if (packageDoc.remainingSessions <= 0) {
        return {
          success: false,
          message: 'No remaining sessions in package',
          amount: 0,
          paymentRequired: false
        };
      }

      const isFirstSession = sessionNumber === 1;
      const isLastSession = packageDoc.remainingSessions === 1;

      let paymentAmount = 0;
      let paymentRequired = false;
      let chatSupportActivated = false;

      if (isFirstSession) {
        // First session: Charge full package amount
        paymentAmount = totalAmount;
        paymentRequired = true;

        // Record payment transaction
        if (transactionId) {
          await this.recordPackagePayment({
            userId,
            mentorId,
            packageId,
            amount: paymentAmount,
            transactionId,
            sessionNumber,
            paymentType: 'package_advance_payment'
          });
        }

        // Send payment notification
        const user = await User.findById(userId);
        if (user) {
          await PaymentNotificationService.sendPaymentNotification({
            userId,
            userName: `${user.name.firstName} ${user.name.lastName}`,
            userEmail: user.email,
            amount: paymentAmount,
            transactionId: transactionId || `PKG-${Date.now()}`,
            paymentId: `PACKAGE-${packageId}`,
            status: 'success',
            transactionType: 'package_advance_payment',
            timestamp: new Date(),
            mentorId,
            sessionType: paymentData.sessionType
          });
        }
      } else {
        // Subsequent sessions: No payment required (already paid in advance)
        paymentAmount = 0;
        paymentRequired = false;
      }

      // Update package session count
      await SessionPackage.findByIdAndUpdate(packageId, {
        $inc: { remainingSessions: -1 }
      });

      if (isLastSession) {
        // Last session: Activate chat support
        await SessionPackage.findByIdAndUpdate(packageId, {
          status: 'chat_support_active',
          chatSupportExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        chatSupportActivated = true;
      }

      return {
        success: true,
        message: isFirstSession 
          ? 'Package payment processed successfully' 
          : 'Session accessed (pre-paid)',
        amount: paymentAmount,
        paymentRequired,
        chatSupportActivated
      };

    } catch (error) {
      console.error('Error processing package session payment:', error);
      return {
        success: false,
        message: 'Payment processing failed',
        amount: 0,
        paymentRequired: false
      };
    }
  }

  /**
   * Record package payment transaction
   */
  private static async recordPackagePayment(paymentData: {
    userId: string;
    mentorId: string;
    packageId: string;
    amount: number;
    transactionId: string;
    sessionNumber: number;
    paymentType: string;
  }) {
    try {
      // You can create a PackagePayment model or use existing payment tracking
      // For now, we'll log the transaction
      console.log('Package Payment Recorded:', {
        ...paymentData,
        timestamp: new Date().toISOString()
      });

      // TODO: Implement actual payment record storage if needed
      // const paymentRecord = new PackagePayment(paymentData);
      // await paymentRecord.save();

    } catch (error) {
      console.error('Error recording package payment:', error);
    }
  }

  /**
   * Get package payment summary for a user
   */
  public static async getPackagePaymentSummary(userId: string, packageId: string) {
    try {
      const packageDoc = await SessionPackage.findById(packageId)
        .populate('mentorId', 'name')
        .populate('categoryId', 'name');

      if (!packageDoc || packageDoc.userId?.toString() !== userId) {
        return null;
      }

      const sessionsUsed = packageDoc.totalSessions - packageDoc.remainingSessions;
      const completionPercentage = (sessionsUsed / packageDoc.totalSessions) * 100;

      return {
        packageId,
        totalSessions: packageDoc.totalSessions,
        remainingSessions: packageDoc.remainingSessions,
        sessionsUsed,
        completionPercentage: Math.round(completionPercentage),
        totalPaid: packageDoc.price,
        pricePerSession: Math.round(packageDoc.price / packageDoc.totalSessions),
        status: packageDoc.status,
        chatSupportActive: packageDoc.status === 'chat_support_active',
        chatSupportExpiresAt: (packageDoc as any).chatSupportExpiresAt,
        mentorName: (packageDoc.mentorId as any)?.name,
        categoryName: (packageDoc.categoryId as any)?.name
      };

    } catch (error) {
      console.error('Error getting package payment summary:', error);
      return null;
    }
  }

  /**
   * Check if user has active chat support for a package
   */
  public static async hasActiveChatSupport(userId: string, mentorId: string): Promise<boolean> {
    try {
      const activeChatSupport = await SessionPackage.findOne({
        userId,
        mentorId,
        status: 'chat_support_active',
        chatSupportExpiresAt: { $gt: new Date() }
      });

      return !!activeChatSupport;
    } catch (error) {
      console.error('Error checking chat support status:', error);
      return false;
    }
  }

  /**
   * Extend chat support for a package (admin function)
   */
  public static async extendChatSupport(
    packageId: string, 
    additionalDays: number = 7
  ): Promise<boolean> {
    try {
      const result = await SessionPackage.findByIdAndUpdate(packageId, {
        chatSupportExpiresAt: new Date(Date.now() + additionalDays * 24 * 60 * 60 * 1000)
      });

      return !!result;
    } catch (error) {
      console.error('Error extending chat support:', error);
      return false;
    }
  }
}