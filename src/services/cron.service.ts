import cron from 'node-cron';
import { DeactivationService } from './deactivation.service';
import { User } from '../model';

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
}