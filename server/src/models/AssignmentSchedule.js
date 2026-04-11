const mongoose = require('mongoose');

const assignmentScheduleSchema = new mongoose.Schema(
  {
    yearKey: {
      type: String,
      required: true,
      enum: ['year1', 'year2', 'year3', 'year4'],
    },
    moduleName: { type: String, required: true, trim: true },
    assignmentName: { type: String, required: true, trim: true },
    dueDate: { type: Date, required: true },
    studyPreference: {
      type: String,
      enum: ['hard', 'easy', 'neutral'],
      default: 'neutral',
    },
    timeSlot: { type: String, required: true, trim: true },
    progress: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed'],
      default: 'Not Started',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

assignmentScheduleSchema.index({ yearKey: 1, moduleName: 1, dueDate: 1, createdAt: -1 });

module.exports = mongoose.model('AssignmentSchedule', assignmentScheduleSchema);
