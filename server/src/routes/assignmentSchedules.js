const express = require('express');
const auth = require('../middleware/auth');
const AssignmentSchedule = require('../models/AssignmentSchedule');
const User = require('../models/User');

const router = express.Router();
const YEAR_KEYS = ['year1', 'year2', 'year3', 'year4'];
const STUDY_PREFERENCES = ['hard', 'easy', 'neutral'];

function parseDate(dateStr) {
  const value = new Date(dateStr);
  return Number.isNaN(value.getTime()) ? null : value;
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function validateAssignmentInput({ yearKey, moduleName, assignmentName, dueDate, timeSlot, studyPreference }) {
  if (!YEAR_KEYS.includes(yearKey)) {
    return 'Invalid year key';
  }

  if (!moduleName || typeof moduleName !== 'string' || !moduleName.trim()) {
    return 'Module name is required';
  }

  if (!assignmentName || typeof assignmentName !== 'string' || !assignmentName.trim()) {
    return 'Assignment name is required';
  }

  if (!timeSlot || typeof timeSlot !== 'string' || !timeSlot.trim()) {
    return 'Assignment time slot is required';
  }

  if (studyPreference !== undefined && !STUDY_PREFERENCES.includes(studyPreference)) {
    return 'Invalid study preference';
  }

  const parsedDue = parseDate(dueDate);
  if (!parsedDue) {
    return 'A valid due date is required';
  }

  const today = startOfDay(new Date());
  const dueDay = startOfDay(parsedDue);
  if (dueDay < today) {
    return 'Past assignment dates are not allowed';
  }

  return null;
}

async function isLicUser(userId) {
  const user = await User.findById(userId).select('itNumber');
  const itNumber = String(user?.itNumber || '').trim().toUpperCase();
  return itNumber.startsWith('LIC');
}

router.get('/assignment-schedules', auth, async (req, res) => {
  try {
    const licUser = await isLicUser(req.user.id);
    const query = licUser ? {} : { createdBy: req.user.id };

    const schedules = await AssignmentSchedule.find(query)
      .sort({ dueDate: 1 })
      .populate('createdBy', 'username');

    res.json(schedules);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/assignment-schedules', auth, async (req, res) => {
  try {
    const { yearKey, moduleName, assignmentName, dueDate, timeSlot, studyPreference } = req.body;
    const validationMessage = validateAssignmentInput({
      yearKey,
      moduleName,
      assignmentName,
      dueDate,
      timeSlot,
      studyPreference,
    });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const schedule = await AssignmentSchedule.create({
      yearKey,
      moduleName: moduleName.trim(),
      assignmentName: assignmentName.trim(),
      dueDate: parseDate(dueDate),
      timeSlot: timeSlot.trim(),
      studyPreference: STUDY_PREFERENCES.includes(studyPreference) ? studyPreference : 'neutral',
      createdBy: req.user.id,
    });

    await schedule.populate('createdBy', 'username');
    res.status(201).json(schedule);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/assignment-schedules/:id', auth, async (req, res) => {
  try {
    const { yearKey, moduleName, assignmentName, dueDate, timeSlot, studyPreference } = req.body;
    const validationMessage = validateAssignmentInput({
      yearKey,
      moduleName,
      assignmentName,
      dueDate,
      timeSlot,
      studyPreference,
    });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const licUser = await isLicUser(req.user.id);
    const ownerQuery = licUser ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user.id };
    const schedule = await AssignmentSchedule.findOne(ownerQuery);
    if (!schedule) {
      return res.status(404).json({ message: 'Assignment schedule not found' });
    }

    schedule.yearKey = yearKey;
    schedule.moduleName = moduleName.trim();
    schedule.assignmentName = assignmentName.trim();
    schedule.dueDate = parseDate(dueDate);
    schedule.timeSlot = timeSlot.trim();
    schedule.studyPreference = STUDY_PREFERENCES.includes(studyPreference) ? studyPreference : 'neutral';

    await schedule.save();
    await schedule.populate('createdBy', 'username');

    res.json(schedule);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/assignment-schedules/:id/progress', auth, async (req, res) => {
  try {
    const VALID_PROGRESS = ['Not Started', 'In Progress', 'Completed'];
    const { progress } = req.body;

    if (!VALID_PROGRESS.includes(progress)) {
      return res.status(400).json({ message: 'Invalid progress value' });
    }

    const schedule = await AssignmentSchedule.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!schedule) {
      return res.status(404).json({ message: 'Assignment schedule not found' });
    }

    schedule.progress = progress;
    await schedule.save();
    await schedule.populate('createdBy', 'username');

    res.json(schedule);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/assignment-schedules/:id', auth, async (req, res) => {
  try {
    const licUser = await isLicUser(req.user.id);
    const ownerQuery = licUser ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user.id };
    const schedule = await AssignmentSchedule.findOne(ownerQuery);

    if (!schedule) {
      return res.status(404).json({ message: 'Assignment schedule not found' });
    }

    await schedule.deleteOne();
    res.json({ message: 'Assignment schedule deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
