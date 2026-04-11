const mongoose = require('mongoose');

const examScheduleSchema = new mongoose.Schema(
  {
    yearKey: {
      type: String,
      required: true,
      enum: ['year1', 'year2', 'year3', 'year4'],
    },
    moduleName: { type: String, required: true, trim: true },
    midExamDate: { type: Date, required: true },
    finalExamDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

examScheduleSchema.index({ yearKey: 1, moduleName: 1, createdAt: -1 });

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
