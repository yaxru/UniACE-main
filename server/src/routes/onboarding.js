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
