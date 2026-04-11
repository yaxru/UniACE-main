const mongoose = require('mongoose');

const examDateEntrySchema = new mongoose.Schema(
  {
    examType: {
      type: String,
      required: true,
      enum: ['mid', 'final'],
    },
    yearKey: {
      type: String,
      required: true,
      enum: ['year1', 'year2', 'year3', 'year4'],
    },
    moduleName: { type: String, required: true, trim: true },
    examDate: { type: Date, required: true },
    studyPreference: {
      type: String,
      enum: ['hard', 'easy', 'neutral'],
      default: 'neutral',
    },
    examStartTime: { type: String, trim: true },
    examEndTime: { type: String, trim: true },
    examTimeSlot: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

examDateEntrySchema.index({ examType: 1, yearKey: 1, moduleName: 1, examDate: 1, createdAt: -1 });

module.exports = mongoose.model('ExamDateEntry', examDateEntrySchema);
