const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    itNumber: { type: String, trim: true, default: null },
    role: { type: String, default: null },
    modulesByYear: {
      type: {
        year1: [{ type: String, trim: true }],
        year2: [{ type: String, trim: true }],
        year3: [{ type: String, trim: true }],
        year4: [{ type: String, trim: true }],
      },
      default: () => ({
        year1: [],
        year2: [],
        year3: [],
        year4: [],
      }),
    },
    // Onboarding fields
    faculty: { type: String, trim: true, default: null },
    year: { type: String, trim: true, default: null },
    batch: { type: String, trim: true, default: null },
    location: { type: String, trim: true, default: null },
    onCampus: { type: String, trim: true, default: null },
    availability: { type: [String], default: [] },
    studyMethod: { type: String, trim: true, default: null },
    studyStyle: { type: String, trim: true, default: null },
    studyGoals: { type: [String], default: [] },
    currentModules: { type: [String], default: [] },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
