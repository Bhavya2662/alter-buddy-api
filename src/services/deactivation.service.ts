import { User } from '../model';
import { IUserProps } from '../interface/user.interface';
import { Document } from 'mongoose';

export class DeactivationService {
  /**
   * Deactivate a user account temporarily
   * @param userId - User ID to deactivate
   * @param reason - Reason for deactivation
   * @param reactivationDate - Date when account should be reactivated (optional)
   */
  static async deactivateTemporarily(
    userId: string,
    reason?: string,
    reactivationDate?: Date
  ): Promise<IUserProps | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'deactivation.isDeactivated': true,
            'deactivation.type': 'temporary',
            'deactivation.deactivatedAt': new Date(),
            'deactivation.reactivationDate': reactivationDate,
            'deactivation.reason': reason,
            online: false, // Set user offline when deactivated
          },
        },
        { new: true }
      );
      return user;
    } catch (error) {
      console.error('Error deactivating user temporarily:', error);
      throw error;
    }
  }

  /**
   * Deactivate a user account permanently
   * @param userId - User ID to deactivate
   * @param reason - Reason for deactivation
   */
  static async deactivatePermanently(
    userId: string,
    reason?: string
  ): Promise<IUserProps | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'deactivation.isDeactivated': true,
            'deactivation.type': 'permanent',
            'deactivation.deactivatedAt': new Date(),
            'deactivation.reason': reason,
            online: false, // Set user offline when deactivated
          },
          $unset: {
            'deactivation.reactivationDate': 1, // Remove reactivation date for permanent deactivation
          },
        },
        { new: true }
      );
      return user;
    } catch (error) {
      console.error('Error deactivating user permanently:', error);
      throw error;
    }
  }

  /**
   * Reactivate a user account
   * @param userId - User ID to reactivate
   */
  static async reactivateUser(userId: string): Promise<IUserProps | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'deactivation.isDeactivated': false,
          },
          $unset: {
            'deactivation.type': 1,
            'deactivation.deactivatedAt': 1,
            'deactivation.reactivationDate': 1,
            'deactivation.reason': 1,
          },
        },
        { new: true }
      );
      return user;
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw error;
    }
  }

  /**
   * Check if a user account is deactivated
   * @param userId - User ID to check
   */
  static async isUserDeactivated(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      return user?.deactivation?.isDeactivated || false;
    } catch (error) {
      console.error('Error checking user deactivation status:', error);
      return false;
    }
  }

  /**
   * Get users that should be auto-reactivated (temporary deactivation expired)
   */
  static async getUsersForAutoReactivation(): Promise<(IUserProps & Document)[]> {
    try {
      const now = new Date();
      const users = await User.find({
        'deactivation.isDeactivated': true,
        'deactivation.type': 'temporary',
        'deactivation.reactivationDate': { $lte: now },
      });
      return users;
    } catch (error) {
      console.error('Error getting users for auto-reactivation:', error);
      return [];
    }
  }

  /**
   * Get permanently deactivated users that should be auto-deleted after 90 days
   */
  static async getUsersForAutoDeletion(): Promise<(IUserProps & Document)[]> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const users = await User.find({
        'deactivation.isDeactivated': true,
        'deactivation.type': 'permanent',
        'deactivation.deactivatedAt': { $lte: ninetyDaysAgo },
      });
      return users;
    } catch (error) {
      console.error('Error getting users for auto-deletion:', error);
      return [];
    }
  }

  /**
   * Auto-reactivate users whose temporary deactivation has expired
   */
  static async processAutoReactivations(): Promise<number> {
    try {
      const users = await this.getUsersForAutoReactivation();
      let reactivatedCount = 0;

      for (const user of users) {
        await this.reactivateUser(user._id.toString());
        reactivatedCount++;
        console.log(`Auto-reactivated user: ${user.email}`);
      }

      return reactivatedCount;
    } catch (error) {
      console.error('Error processing auto-reactivations:', error);
      return 0;
    }
  }

  /**
   * Auto-delete permanently deactivated users after 90 days
   */
  static async processAutoDeletions(): Promise<number> {
    try {
      const users = await this.getUsersForAutoDeletion();
      let deletedCount = 0;

      for (const user of users) {
        await User.findByIdAndDelete(user._id);
        deletedCount++;
        console.log(`Auto-deleted permanently deactivated user: ${user.email}`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error processing auto-deletions:', error);
      return 0;
    }
  }

  /**
   * Run daily maintenance tasks for deactivation system
   */
  static async runDailyMaintenance(): Promise<void> {
    try {
      console.log('Running deactivation system daily maintenance...');
      
      const reactivatedCount = await this.processAutoReactivations();
      const deletedCount = await this.processAutoDeletions();
      
      console.log(`Daily maintenance completed: ${reactivatedCount} users reactivated, ${deletedCount} users deleted`);
    } catch (error) {
      console.error('Error running daily maintenance:', error);
    }
  }
}