const express = require("express");
const StudyGroup = require("../models/StudyGroup");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// Score how well a group matches a user's onboarding profile (higher = better match)
function matchScore(group, user) {
  let score = 0;
  if (group.faculty && user.faculty && group.faculty === user.faculty)
    score += 3;
  if (group.batch && user.batch && group.batch === user.batch) score += 2;
  if (
    group.studyMethod &&
    user.studyMethod &&
    group.studyMethod === user.studyMethod
  )
    score += 2;
  if (group.modules.length && user.currentModules.length) {
    const overlap = group.modules.filter((m) =>
      user.currentModules.includes(m),
    );
    score += overlap.length;
  }
  return score;
}

// GET /api/studygroups/suggest  — groups ranked by match score, not already joined, not full
router.get("/studygroups/suggest", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userId = user._id.toString();
    const groups = await StudyGroup.find().populate("members", "username name");

    const suggestions = groups
      .filter((g) => g.members.length < g.maxMembers)
      .filter((g) => !g.members.some((m) => m._id.toString() === userId))
      .map((g) => ({ ...g.toObject(), score: matchScore(g, user) }))
      .sort((a, b) => b.score - a.score || a.members.length - b.members.length);

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/studygroups/mine  — groups the logged-in user is a member of
router.get("/studygroups/mine", auth, async (req, res) => {
  try {
    const groups = await StudyGroup.find({ members: req.user.id }).populate(
      "members",
      "username name",
    );
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/studygroups  — all groups
router.get("/studygroups", auth, async (req, res) => {
  try {
    const groups = await StudyGroup.find().populate("members", "username name");
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/studygroups  — create a new group, creator is automatically added as first member
router.post("/studygroups", auth, async (req, res) => {
  try {
    const {
      name,
      description,
      faculty,
      batch,
      studyMethod,
      modules,
      maxMembers,
    } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const parsedMax = parseInt(maxMembers, 10);
    if (isNaN(parsedMax) || parsedMax < 2 || parsedMax > 20) {
      return res
        .status(400)
        .json({ message: "Max members must be between 2 and 20" });
    }

    const moduleList =
      typeof modules === "string"
        ? modules
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean)
        : [];

    const group = new StudyGroup({
      name: name.trim(),
      description: description ? description.trim() : "",
      faculty,
      batch,
      studyMethod,
      modules: moduleList,
      maxMembers: parsedMax,
      members: [req.user.id],
      createdBy: req.user.id,
    });

    await group.save();
    const populated = await group.populate("members", "username name");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/studygroups/:id/join  — join a group
router.post("/studygroups/:id/join", auth, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.members.length >= group.maxMembers) {
      return res
        .status(400)
        .json({
          message: `This group is full (max ${group.maxMembers} members)`,
        });
    }

    const alreadyMember = group.members.some(
      (m) => m.toString() === req.user.id,
    );
    if (alreadyMember) {
      return res.status(400).json({ message: "You are already in this group" });
    }

    group.members.push(req.user.id);
    await group.save();
    const populated = await group.populate("members", "username name");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/studygroups/:id/leave  — leave a group
router.delete("/studygroups/:id/leave", auth, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.members = group.members.filter((m) => m.toString() !== req.user.id);
    await group.save();
    const populated = await group.populate("members", "username name");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
