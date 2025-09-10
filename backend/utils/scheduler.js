const cron = require('node-cron');
const Report = require('../models/Report');
const Analytics = require('../models/Analytics');

const startScheduledJobs = () => {
  console.log('Starting scheduled jobs');

  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Running daily analytics job');
      const total = await Report.countDocuments();
      const byCategory = await Report.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);
      const avgResponse = 0;
      const analytics = new Analytics({ totalReports: total, byCategory: byCategory.reduce((m, r) => (m.set(r._id, r.count), m), new Map()), avgResponseTimeHours: avgResponse });
      await analytics.save();
      console.log('Daily analytics saved');
    } catch (err) {
      console.error('Daily analytics error', err);
    }
  });

  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running hourly cleanup');
      const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365);
      const oldCount = await Report.countDocuments({ status: 'resolved', updatedAt: { $lt: cutoff } });
      if (oldCount) console.log('Old resolved reports found:', oldCount);
    } catch (err) {
      console.error('Cleanup job error', err);
    }
  });
};

module.exports = { startScheduledJobs };
