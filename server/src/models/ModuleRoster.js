const mongoose = require('mongoose');

const rosterRowSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    itNumber: { type: String, required: true, trim: true },
    groupNo: { type: String, trim: true, default: null },
    groupName: { type: String, trim: true, default: null },
    availableDates: { type: String, trim: true, default: null },
    timeSlots: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const moduleRosterSchema = new mongoose.Schema(
  {
    listType: {
      type: String,
      required: true,
      enum: ['student', 'lecturer'],
      default: 'student',
    },
    yearKey: {
      type: String,
      required: true,
      enum: ['year1', 'year2', 'year3', 'year4'],
    },
    moduleName: { type: String, required: true, trim: true },
    sourceFileName: { type: String, required: true, trim: true },
    rows: { type: [rosterRowSchema], default: [] },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

moduleRosterSchema.index({ listType: 1, yearKey: 1, moduleName: 1, createdAt: -1 });

module.exports = mongoose.model('ModuleRoster', moduleRosterSchema);
