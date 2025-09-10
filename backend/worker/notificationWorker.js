// backend/worker/notificationWorker.js
const nodemailer = require('nodemailer');
const webpush = require('web-push');
const User = require('../models/User');
const logger = require('../utils/logger');

const smtpHost = process.env.SMTP_HOST;
let transporter = null;
if (smtpHost) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:admin@civic-connect.local', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

module.exports = function(notificationQueue) {
  notificationQueue.process(5, async (job) => {
    const { name } = job;
    try {
      if (name === 'report-status-change') {
        const { userId, reportId, status } = job.data;
        const user = await User.findById(userId);
        if (!user) {
          logger.warn('Notification: user not found userId=%s', userId);
          return;
        }

        if (transporter && user.email) {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'no-reply@civic-connect.local',
            to: user.email,
            subject: `Update on report ${reportId}`,
            text: `Your report ${reportId} is now ${status}`
          });
          logger.info('Email sent to %s for report %s status=%s', user.email, reportId, status);
        } else {
          logger.info('No SMTP configured or user email missing; skipping email for userId=%s', userId);
        }

        // If user has push subscription stored in profile, send push (not implemented by default)
        if (user.pushSubscription && process.env.VAPID_PUBLIC_KEY) {
          try {
            await webpush.sendNotification(user.pushSubscription, JSON.stringify({ title: 'Report update', body: `Status: ${status}` }));
            logger.info('Push notification sent to userId=%s', userId);
          } catch (pushErr) {
            logger.warn('Push send failed for userId=%s err=%s', userId, pushErr.message);
          }
        }
      }

      return { ok: true };
    } catch (err) {
      logger.error('Notification worker error: %s', err.message);
      throw err;
    }
  });
};
