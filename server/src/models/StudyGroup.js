const mongoose = require("mongoose");

const studyGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    faculty: { type: String, trim: true, default: "" },
    batch: { type: String, trim: true, default: "" },
    studyMethod: { type: String, trim: true, default: "" },
    modules: { type: [String], default: [] },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StudyGroup", studyGroupSchema);
