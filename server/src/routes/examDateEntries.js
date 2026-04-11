const express = require('express');
const auth = require('../middleware/auth');
const ExamDateEntry = require('../models/ExamDateEntry');
const User = require('../models/User');

const router = express.Router();
const YEAR_KEYS = ['year1', 'year2', 'year3', 'year4'];
const EXAM_TYPES = ['mid', 'final'];
const STUDY_PREFERENCES = ['hard', 'easy', 'neutral'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseDate(dateStr) {
  const value = new Date(dateStr);
  return Number.isNaN(value.getTime()) ? null : value;
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  return (hours * 60) + minutes;
}

function validateInput({ examType, yearKey, moduleName, examDate, examStartTime, examEndTime, studyPreference }) {
  if (!EXAM_TYPES.includes(examType)) return 'Invalid exam type';
  if (!YEAR_KEYS.includes(yearKey)) return 'Invalid year key';
  if (!moduleName || typeof moduleName !== 'string' || !moduleName.trim()) {
    return 'Module name is required';
  }

  if (!examStartTime || typeof examStartTime !== 'string' || !TIME_PATTERN.test(examStartTime)) {
    return 'A valid exam start time is required';
  }

  if (!examEndTime || typeof examEndTime !== 'string' || !TIME_PATTERN.test(examEndTime)) {
    return 'A valid exam end time is required';
  }

  if (timeToMinutes(examEndTime) <= timeToMinutes(examStartTime)) {
    return 'Exam end time must be after start time';
  }

  if (studyPreference !== undefined && !STUDY_PREFERENCES.includes(studyPreference)) {
    return 'Invalid study preference';
  }

  const parsed = parseDate(examDate);
  if (!parsed) return 'A valid exam date is required';

  if (startOfDay(parsed) < startOfDay(new Date())) {
    return 'Past exam dates are not allowed';
  }

  return null;
}

async function isLicUser(userId) {
  const user = await User.findById(userId).select('itNumber');
  const itNumber = String(user?.itNumber || '').trim().toUpperCase();
  return itNumber.startsWith('LIC');
}

router.get('/exam-date-entries', auth, async (req, res) => {
  try {
    const examType = typeof req.query.examType === 'string' ? req.query.examType : '';

    if (!EXAM_TYPES.includes(examType)) {
      return res.status(400).json({ message: 'Invalid exam type' });
    }

    const licUser = await isLicUser(req.user.id);
    const query = licUser ? { examType } : { examType, createdBy: req.user.id };

    const schedules = await ExamDateEntry.find(query)
      .sort({ examDate: 1 })
      .populate('createdBy', 'username');

    res.json(schedules);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/exam-date-entries', auth, async (req, res) => {
  try {
    const { examType, yearKey, moduleName, examDate, examStartTime, examEndTime, studyPreference } = req.body;
    const validationMessage = validateInput({
      examType,
      yearKey,
      moduleName,
      examDate,
      examStartTime,
      examEndTime,
      studyPreference,
    });
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const schedule = await ExamDateEntry.create({
      examType,
      yearKey,
      moduleName: moduleName.trim(),
      examDate: parseDate(examDate),
      studyPreference: STUDY_PREFERENCES.includes(studyPreference) ? studyPreference : 'neutral',
      examStartTime: examStartTime.trim(),
      examEndTime: examEndTime.trim(),
      examTimeSlot: `${examStartTime.trim()} - ${examEndTime.trim()}`,
      createdBy: req.user.id,
    });

    await schedule.populate('createdBy', 'username');
    res.status(201).json(schedule);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/exam-date-entries/:id', auth, async (req, res) => {
  try {
    const { examType, yearKey, moduleName, examDate, examStartTime, examEndTime, studyPreference } = req.body;
    const validationMessage = validateInput({
      examType,
      yearKey,
      moduleName,
      examDate,
      examStartTime,
      examEndTime,
      studyPreference,
    });
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const licUser = await isLicUser(req.user.id);
    const ownerQuery = licUser ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user.id };
    const schedule = await ExamDateEntry.findOne(ownerQuery);
    if (!schedule) {
      return res.status(404).json({ message: 'Exam date entry not found' });
    }

    schedule.examType = examType;
    schedule.yearKey = yearKey;
    schedule.moduleName = moduleName.trim();
    schedule.examDate = parseDate(examDate);
    schedule.studyPreference = STUDY_PREFERENCES.includes(studyPreference) ? studyPreference : 'neutral';
    schedule.examStartTime = examStartTime.trim();
    schedule.examEndTime = examEndTime.trim();
    schedule.examTimeSlot = `${examStartTime.trim()} - ${examEndTime.trim()}`;

    await schedule.save();
    await schedule.populate('createdBy', 'username');

    res.json(schedule);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/exam-date-entries/:id', auth, async (req, res) => {
  try {
    const licUser = await isLicUser(req.user.id);
    const ownerQuery = licUser ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user.id };
    const schedule = await ExamDateEntry.findOne(ownerQuery);
    if (!schedule) {
      return res.status(404).json({ message: 'Exam date entry not found' });
    }

    await schedule.deleteOne();
    res.json({ message: 'Exam date entry deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
