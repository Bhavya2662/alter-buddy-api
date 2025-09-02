import axios from 'axios';
import config from 'config';

interface PaymentNotificationData {
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  transactionId: string;
  paymentId: string;
  status: 'success' | 'failed';
  transactionType: string;
  timestamp: Date;
  mentorId?: string;
  sessionType?: string;
}

export class PaymentNotificationService {
  private static readonly ADMIN_API_URL = 'http://localhost:3002/api'; // Admin panel webhook server URL
  
  public static async sendPaymentNotification(data: PaymentNotificationData): Promise<void> {
    try {
      await axios.post(`${this.ADMIN_API_URL}/payment-notifications`, {
        ...data,
        source: 'alter-buddy',
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.get('ADMIN_API_KEY') || 'default-key'}` // Add admin API key to config
        },
        timeout: 5000
      });
      
      console.log('Payment notification sent successfully:', data.transactionId);
    } catch (error) {
      console.error('Failed to send payment notification:', error.message);
      // Don't throw error to avoid breaking the main payment flow
    }
  }
}