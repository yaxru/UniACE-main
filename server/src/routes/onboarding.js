const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// PUT /api/onboarding  — save onboarding data for the logged-in user
router.put("/onboarding", auth, async (req, res) => {
  try {
    const {
      name,
      itNumber,
      faculty,
      year,
      batch,
      modules,
      location,
      onCampus,
      availability,
      studyMethod,
      studyStyle,
      studyGoals,
    } = req.body;

    // --- Validation ---
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Full name is required." });
    }
    if (itNumber && !/^(IT|LIC)\d+$/i.test(String(itNumber).trim())) {
      return res.status(400).json({
        message:
          "IT Number must start with IT or LIC followed by digits (e.g. IT21234567).",
      });
    }
    if (!faculty) {
      return res.status(400).json({ message: "Faculty is required." });
    }
    if (!year) {
      return res.status(400).json({ message: "Year of study is required." });
    }
    if (!batch) {
      return res.status(400).json({ message: "Batch type is required." });
    }
    if (!studyMethod) {
      return res.status(400).json({ message: "Study method is required." });
    }
    if (!studyStyle) {
      return res.status(400).json({ message: "Study style is required." });
    }
    if (!Array.isArray(studyGoals) || studyGoals.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one study goal is required." });
    }

    // Parse modules string into a clean array
    const currentModules =
      typeof modules === "string"
        ? modules
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean)
        : [];

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      {
        name,
        itNumber,
        faculty,
        year,
        batch,
        currentModules,
        location,
        onCampus,
        availability: Array.isArray(availability) ? availability : [],
        studyMethod,
        studyStyle,
        studyGoals: Array.isArray(studyGoals) ? studyGoals : [],
        onboardingComplete: true,
      },
      { new: true },
    );

    res.json({
      message: "Onboarding complete",
      user: {
        id: updated._id.toString(),
        username: updated.username,
        name: updated.name,
        itNumber: updated.itNumber,
        faculty: updated.faculty,
        year: updated.year,
        batch: updated.batch,
        location: updated.location,
        onCampus: updated.onCampus,
        availability: updated.availability,
        studyMethod: updated.studyMethod,
        studyStyle: updated.studyStyle,
        studyGoals: updated.studyGoals,
        currentModules: updated.currentModules,
        onboardingComplete: updated.onboardingComplete,
        role: updated.role,
        modulesByYear: updated.modulesByYear,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
