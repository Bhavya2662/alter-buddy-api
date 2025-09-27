import cron from 'node-cron';
import { DeactivationService } from './deactivation.service';
import { User } from '../model';
import { CallSchedule } from '../model/call-schedule.model';
import { SessionPackage } from '../model/session-package.model';
import { MailSender } from './mail-sender.service';
import moment from 'moment';

export class CronService {
  /**
   * Initialize all cron jobs
   */
  public static initializeCronJobs(): void {
    // Run auto-reactivation check every hour
    cron.schedule('0 * * * *', async () => {
      console.log('Running auto-reactivation check...');
      await CronService.processAutoReactivation();
    });

    // Run auto-deletion check daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Running auto-deletion check...');
      await CronService.processAutoDeletion();
    });

    // Run session reminder emails daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('Running session reminder email check...');
      await CronService.processSessionReminders();
    });

    console.log('Cron jobs initialized successfully');
  }

  /**
   * Process auto-reactivation for temporary deactivated accounts
   */
  private static async processAutoReactivation(): Promise<void> {
    try {
      const usersToReactivate = await DeactivationService.getUsersForAutoReactivation();
      
      for (const user of usersToReactivate) {
        try {
          await DeactivationService.reactivateUser(user._id.toString());
          console.log(`Auto-reactivated user: ${user._id}`);
        } catch (error) {
          console.error(`Failed to auto-reactivate user ${user._id}:`, error);
        }
      }

      if (usersToReactivate.length > 0) {
        console.log(`Auto-reactivated ${usersToReactivate.length} users`);
      }
    } catch (error) {
      console.error('Error in auto-reactivation process:', error);
    }
  }

  /**
   * Process auto-deletion for permanently deactivated accounts (after 90 days)
   */
  private static async processAutoDeletion(): Promise<void> {
    try {
      const usersToDelete = await DeactivationService.getUsersForAutoDeletion();
      
      for (const user of usersToDelete) {
        try {
          // Instead of hard deletion, we'll mark them for deletion
          // You might want to implement a soft delete or move to archive
          await User.findByIdAndUpdate(user._id, {
            $set: {
              'deactivation.markedForDeletion': true,
              'deactivation.deletionScheduledAt': new Date()
            }
          });
          console.log(`Marked user for deletion: ${user._id}`);
        } catch (error) {
          console.error(`Failed to mark user for deletion ${user._id}:`, error);
        }
      }

      if (usersToDelete.length > 0) {
        console.log(`Marked ${usersToDelete.length} users for deletion`);
      }
    } catch (error) {
      console.error('Error in auto-deletion process:', error);
    }
  }

  /**
   * Manual trigger for auto-reactivation (for testing)
   */
  public static async triggerAutoReactivation(): Promise<void> {
    await CronService.processAutoReactivation();
  }

  /**
   * Manual trigger for auto-deletion (for testing)
   */
  public static async triggerAutoDeletion(): Promise<void> {
    await CronService.processAutoDeletion();
  }

  /**
   * Process session reminder emails for sessions scheduled tomorrow
   */
  private static async processSessionReminders(): Promise<void> {
    try {
      const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
      console.log(`Checking for sessions scheduled on ${tomorrow}`);

      // Find all scheduled sessions for tomorrow
      const scheduledSessions = await CallSchedule.find({
        slotsDate: tomorrow,
        'slots.booked': true,
        'slots.status': { $in: ['accepted'] }
      })
      .populate('mentorId', 'name contact')
      .populate('slots.userId', 'name email');

      let emailsSent = 0;

      for (const schedule of scheduledSessions) {
        for (const slot of schedule.slots) {
          if (slot.booked && slot.userId && slot.status === 'accepted') {
            try {
              await CronService.sendSessionReminderEmail(schedule, slot);
              emailsSent++;
            } catch (error) {
              console.error(`Failed to send reminder email for slot ${slot._id}:`, error);
            }
          }
        }
      }

      if (emailsSent > 0) {
        console.log(`Sent ${emailsSent} session reminder emails`);
      } else {
        console.log('No session reminders to send');
      }
    } catch (error) {
      console.error('Error in session reminder process:', error);
    }
  }

  /**
   * Send session reminder email to user
   */
  private static async sendSessionReminderEmail(schedule: any, slot: any): Promise<void> {
    const user = slot.userId;
    const mentor = schedule.mentorId;
    
    if (!user || !mentor || !user.email) {
      console.log('Missing user or mentor information for reminder email');
      return;
    }

    const sessionDate = moment(schedule.slotsDate).format('MMMM Do, YYYY');
    const sessionTime = slot.time;
    const duration = slot.duration || 30;
    const callType = slot.callType || 'audio';

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: '🔔 Session Reminder - Tomorrow at ' + sessionTime,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Session Reminder</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f9f9f9;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 30px auto;
                background: #fff;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .header {
                background-color: #ff9800;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
                margin: -30px -30px 20px -30px;
              }
              .content {
                margin: 20px 0;
                color: #333;
                line-height: 1.6;
              }
              .session-details {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
              }
              .reminder-button {
                display: block;
                width: fit-content;
                margin: 20px auto;
                padding: 15px 25px;
                background-color: #ff9800;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                font-size: 12px;
                color: #999;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔔 Session Reminder</h1>
              </div>
              <div class="content">
                <p>Hi ${user.name?.firstName || 'there'},</p>
                <p><strong>This is a friendly reminder about your upcoming session tomorrow!</strong></p>
                
                <div class="session-details">
                  <p><strong>📅 Date:</strong> ${sessionDate}</p>
                  <p><strong>⏰ Time:</strong> ${sessionTime}</p>
                  <p><strong>⏳ Duration:</strong> ${duration} minutes</p>
                  <p><strong>📞 Type:</strong> ${callType.charAt(0).toUpperCase() + callType.slice(1)} call</p>
                  <p><strong>👨‍💼 Mentor:</strong> ${mentor.name?.firstName || ''} ${mentor.name?.lastName || ''}</p>
                </div>

                <p><strong>📝 Important reminders:</strong></p>
                <ul>
                  <li>Please join 5 minutes before your scheduled time</li>
                  <li>Ensure you have a stable internet connection</li>
                  <li>Being late may reduce your available session time</li>
                  <li>Have your questions ready to make the most of your session</li>
                </ul>

                <p>If you need to reschedule or have any questions, please contact our support team as soon as possible.</p>
                
                <p>Looking forward to your session!</p>
              </div>
              <div class="footer">
                <p>©️ 2025 AlterBuddy. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `
    };

    await MailSender.sendMail(mailOptions);
    console.log(`Session reminder email sent to ${user.email} for session on ${sessionDate} at ${sessionTime}`);
  }

  /**
   * Manual trigger for session reminders (for testing)
   */
  public static async triggerSessionReminders(): Promise<void> {
    await CronService.processSessionReminders();
  }
}