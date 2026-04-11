const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();
const ALLOWED_ROLES = ['student', 'senior student', 'lecturer'];
const YEAR_KEYS = ['year1', 'year2', 'year3', 'year4'];

function normalizeModulesByYear(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const normalized = {};

  for (const key of YEAR_KEYS) {
    const yearModules = input[key];

    if (yearModules === undefined) {
      normalized[key] = [];
      continue;
    }

    if (!Array.isArray(yearModules)) {
      return null;
    }

    normalized[key] = yearModules
      .filter((m) => typeof m === 'string')
      .map((m) => m.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  return normalized;
}

function buildPublicModulesByYear(users) {
  const modules = {
    year1: new Set(),
    year2: new Set(),
    year3: new Set(),
    year4: new Set(),
  };

  for (const user of users) {
    const byYear = user.modulesByYear || {};
    for (const key of YEAR_KEYS) {
      const list = Array.isArray(byYear[key]) ? byYear[key] : [];
      for (const moduleName of list) {
        if (typeof moduleName === 'string' && moduleName.trim()) {
          modules[key].add(moduleName.trim());
        }
      }
    }
  }

  return {
    year1: Array.from(modules.year1).sort((a, b) => a.localeCompare(b)),
    year2: Array.from(modules.year2).sort((a, b) => a.localeCompare(b)),
    year3: Array.from(modules.year3).sort((a, b) => a.localeCompare(b)),
    year4: Array.from(modules.year4).sort((a, b) => a.localeCompare(b)),
  };
}

// GET /api/profile — fetch current user's profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/profile/modules/public — fetch combined modules visible to all users
router.get('/profile/modules/public', auth, async (req, res) => {
  try {
    const users = await User.find({}, 'modulesByYear');
    const modulesByYear = buildPublicModulesByYear(users);
    res.json(modulesByYear);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/profile — update current user's profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, itNumber, role, modulesByYear } = req.body;

    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role value' });
    }

    let normalizedModules = null;
    if (modulesByYear !== undefined) {
      normalizedModules = normalizeModulesByYear(modulesByYear);
      if (!normalizedModules) {
        return res.status(400).json({ message: 'Invalid modules format' });
      }
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name  !== undefined) user.name  = name  || null;
    if (phone !== undefined) user.phone = phone || null;
    if (itNumber !== undefined) user.itNumber = itNumber || null;
    if (role  !== undefined) user.role  = role  || null;
    if (modulesByYear !== undefined) user.modulesByYear = normalizedModules;

    await user.save();

    const updated = await User.findById(req.user.id).select('-password');
    res.json(updated);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
