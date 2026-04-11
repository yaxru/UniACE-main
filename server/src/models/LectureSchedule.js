const mongoose = require('mongoose');

const lectureScheduleSchema = new mongoose.Schema(
  {
    yearKey: {
      type: String,
      required: true,
      enum: ['year1', 'year2', 'year3', 'year4'],
    },
    moduleName: { type: String, required: true, trim: true },
    lectureDay: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    lectureStartTime: { type: String, trim: true },
    lectureEndTime: { type: String, trim: true },
    timeSlot: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

lectureScheduleSchema.index({ yearKey: 1, moduleName: 1, lectureDay: 1, createdAt: -1 });

module.exports = mongoose.model('LectureSchedule', lectureScheduleSchema);
