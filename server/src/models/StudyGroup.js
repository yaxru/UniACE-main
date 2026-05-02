const mongoose = require("mongoose");

const studyGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      minlength: [3, "Group name must be at least 3 characters"],
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    faculty: { type: String, trim: true, default: "" },
    batch: { type: String, trim: true, default: "" },
    studyMethod: {
      type: String,
      trim: true,
      default: "",
      enum: {
        values: ["", "online", "in-person", "hybrid"],
        message: "Study method must be online, in-person, or hybrid",
      },
    },
    modules: { type: [String], default: [] },
    maxMembers: {
      type: Number,
      default: 8,
      min: [2, "A group must have at least 2 members"],
      max: [20, "A group cannot exceed 20 members"],
    },
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
