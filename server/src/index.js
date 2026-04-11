require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const questionRoutes = require("./routes/questions");
const commentRoutes = require("./routes/comments");
const profileRoutes = require("./routes/profile");
const inboxRoutes = require("./routes/inbox");
const moduleRostersRoutes = require("./routes/moduleRosters");
const examSchedulesRoutes = require("./routes/examSchedules");
const assignmentSchedulesRoutes = require("./routes/assignmentSchedules");
const examDateEntriesRoutes = require("./routes/examDateEntries");
const lectureSchedulesRoutes = require("./routes/lectureSchedules");
const onboardingRoutes = require("./routes/onboarding");
const studyGroupRoutes = require("./routes/studyGroups");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api", profileRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api", moduleRostersRoutes);
app.use("/api", examSchedulesRoutes);
app.use("/api", assignmentSchedulesRoutes);
app.use("/api", examDateEntriesRoutes);
app.use("/api", lectureSchedulesRoutes);
app.use("/api", onboardingRoutes);
app.use("/api", studyGroupRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/new";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
