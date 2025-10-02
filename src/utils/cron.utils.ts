import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { CallSchedule } from '../model/call-schedule.model';
import { SessionPackage } from '../model/session-package.model';
import { Chat } from '../model/chat.model';
import { User } from '../model/user.model';
import { Mentor } from '../model/mentor.model';
import moment from 'moment-timezone';

// Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: true },
  });
};

// Send package session reminder email
const sendPackageSessionReminder = async (user: any, mentor: any, sessionDetails: any, packageInfo: any) => {
  try {
    const transporter = createEmailTransporter();
    
    const userMailOptions = {
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: '📅 Package Session Reminder - Tomorrow!',
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
                background-color: #2196F3;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                margin: 20px 0;
                color: #333;
              }
              .session-details {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
              }
              .package-info {
                background-color: #e3f2fd;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
                border-left: 4px solid #2196F3;
              }
              .join-button {
                display: block;
                width: fit-content;
                margin: 20px auto;
                padding: 15px 25px;
                background-color: #2196F3;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                text-align: center;
              }
              .footer {
                text-align: center;
                font-size: 12px;
                color: #999;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📅 Session Reminder</h1>
              </div>
              <div class="content">
                <p>Hi ${user.name.firstName} ${user.name.lastName},</p>
                <p>This is a friendly reminder that you have a <strong>package session</strong> scheduled for tomorrow!</p>
                
                <div class="session-details">
                  <h3>📋 Session Details:</h3>
                  <p><strong>Mentor:</strong> ${mentor.name.firstName} ${mentor.name.lastName}</p>
                  <p><strong>Date:</strong> ${moment(sessionDetails.scheduledDate).format('MMMM Do, YYYY')}</p>
                  <p><strong>Time:</strong> ${sessionDetails.time}</p>
                  <p><strong>Type:</strong> ${sessionDetails.callType.toUpperCase()}</p>
                  <p><strong>Duration:</strong> ${sessionDetails.duration} minutes</p>
                </div>
                
                <div class="package-info">
                  <h3>📦 Package Information:</h3>
                  <p><strong>Package Type:</strong> ${packageInfo.type.toUpperCase()} Sessions</p>
                  <p><strong>Remaining Sessions:</strong> ${packageInfo.remainingSessions} of ${packageInfo.totalSessions}</p>
                  <p><strong>Category:</strong> ${packageInfo.categoryName}</p>
                </div>
                
                <p>Please make sure you're available at the scheduled time. You'll receive the join link closer to the session time.</p>
                
                <p style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL}/user/profile/activity" class="join-button">View My Sessions</a>
                </p>
                
                <p>If you need to reschedule or have any questions, please contact support as soon as possible.</p>
                <p>Thank you!</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Alter Buddy. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };
    
    await transporter.sendMail(userMailOptions);
    console.log(`Package session reminder sent to ${user.email}`);
    
  } catch (error) {
    console.error('Error sending package session reminder:', error);
  }
};

// Check for upcoming package sessions and send reminders
const checkUpcomingPackageSessions = async () => {
  try {
    console.log('🔍 Checking for upcoming package sessions...');
    
    // Get tomorrow's date
    const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
    
    // Find all scheduled sessions for tomorrow that are part of packages
    const upcomingSessions = await CallSchedule.find({
      slotsDate: tomorrow,
      'slots.booked': true,
      'slots.status': 'accepted'
    })
    .populate('mentorId', 'name contact')
    .populate('slots.userId', 'name email');
    
    for (const schedule of upcomingSessions) {
      for (const slot of schedule.slots) {
        if (slot.booked && slot.userId && slot.status === 'accepted') {
          // Check if this session is part of a package
          const userPackages = await SessionPackage.find({
            userId: slot.userId,
            mentorId: schedule.mentorId,
            status: 'active',
            remainingSessions: { $gt: 0 }
          }).populate('categoryId', 'name');
          
          if (userPackages.length > 0) {
            // This is a package session, send reminder
            const user = await User.findById(slot.userId);
            const mentor = await Mentor.findById(schedule.mentorId);
            
            if (user && mentor) {
              const sessionDetails = {
                scheduledDate: tomorrow,
                time: slot.time,
                callType: slot.callType,
                duration: slot.duration || 30
              };
              
              const packageInfo = {
                type: userPackages[0].type,
                remainingSessions: userPackages[0].remainingSessions,
                totalSessions: userPackages[0].totalSessions,
                categoryName: (userPackages[0].categoryId as any)?.name || 'General'
              };
              
              await sendPackageSessionReminder(user, mentor, sessionDetails, packageInfo);
            }
          }
        }
      }
    }
    
    console.log('✅ Package session reminder check completed');
    
  } catch (error) {
    console.error('❌ Error checking upcoming package sessions:', error);
  }
};

// Send chat support activation email after package completion
const sendChatSupportActivationEmail = async (user: any, mentor: any, packageInfo: any) => {
  try {
    const transporter = createEmailTransporter();
    
    const userMailOptions = {
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: '🎉 Package Completed - 1 Week Chat Support Activated!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Chat Support Activated</title>
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
                background-color: #4CAF50;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                margin: 20px 0;
                color: #333;
              }
              .support-info {
                background-color: #e8f5e8;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
                border-left: 4px solid #4CAF50;
              }
              .chat-button {
                display: block;
                width: fit-content;
                margin: 20px auto;
                padding: 15px 25px;
                background-color: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                text-align: center;
              }
              .footer {
                text-align: center;
                font-size: 12px;
                color: #999;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Package Completed!</h1>
              </div>
              <div class="content">
                <p>Hi ${user.name.firstName} ${user.name.lastName},</p>
                <p>Congratulations! You have successfully completed your <strong>${packageInfo.type.toUpperCase()} package</strong> with ${mentor.name.firstName} ${mentor.name.lastName}.</p>
                
                <div class="support-info">
                  <h3>💬 1-Week Chat Support Activated!</h3>
                  <p>As part of your package completion, you now have <strong>1 week of free chat support</strong> with your mentor.</p>
                  <p><strong>Valid until:</strong> ${moment().add(7, 'days').format('MMMM Do, YYYY')}</p>
                  <p><strong>Available:</strong> 24/7 for the next 7 days</p>
                </div>
                
                <p>You can now chat with ${mentor.name.firstName} for any follow-up questions, clarifications, or additional guidance related to your completed sessions.</p>
                
                <p style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL}/user/chat/${mentor._id}" class="chat-button">Start Chat Support</a>
                </p>
                
                <p>Thank you for choosing Alter Buddy for your mentorship journey!</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Alter Buddy. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };
    
    await transporter.sendMail(userMailOptions);
    console.log(`Chat support activation email sent to ${user.email}`);
    
  } catch (error) {
    console.error('Error sending chat support activation email:', error);
  }
};

// Check for completed packages and activate chat support
const checkCompletedPackages = async () => {
  try {
    console.log('🔍 Checking for completed packages...');
    
    // Find packages that just completed (remainingSessions = 0 and status still active)
    const completedPackages = await SessionPackage.find({
      remainingSessions: 0,
      status: 'active'
    })
    .populate('userId', 'name email')
    .populate('mentorId', 'name')
    .populate('categoryId', 'name');
    
    for (const packageDoc of completedPackages) {
      if (packageDoc.userId && packageDoc.mentorId) {
        // Send chat support activation email
        await sendChatSupportActivationEmail(
          packageDoc.userId,
          packageDoc.mentorId,
          {
            type: packageDoc.type,
            totalSessions: packageDoc.totalSessions,
            categoryName: (packageDoc.categoryId as any)?.name || 'General'
          }
        );
        
        // Update package status to indicate chat support is active
        await SessionPackage.findByIdAndUpdate(packageDoc._id, {
          status: 'chat_support_active',
          chatSupportExpiresAt: moment().add(7, 'days').toDate()
        });
      }
    }
    
    console.log('✅ Completed packages check finished');
    
  } catch (error) {
    console.error('❌ Error checking completed packages:', error);
  }
};

// Initialize cron jobs
export const initializeCronJobs = () => {
  console.log('🚀 Initializing package session cron jobs...');
  
  // Run every day at 9:00 AM to send next-day reminders
  cron.schedule('0 9 * * *', () => {
    console.log('⏰ Running daily package session reminder check...');
    checkUpcomingPackageSessions();
  });
  
  // Run every hour to check for completed packages
  cron.schedule('0 * * * *', () => {
    console.log('⏰ Running hourly completed packages check...');
    checkCompletedPackages();
  });
  
  console.log('✅ Package session cron jobs initialized successfully');
};

// Export functions for manual testing
export {
  checkUpcomingPackageSessions,
  checkCompletedPackages,
  sendPackageSessionReminder,
  sendChatSupportActivationEmail
};