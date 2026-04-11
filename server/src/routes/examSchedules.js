const express = require('express');
const auth = require('../middleware/auth');
const ExamSchedule = require('../models/ExamSchedule');

const router = express.Router();
const YEAR_KEYS = ['year1', 'year2', 'year3', 'year4'];

function parseDate(dateStr) {
  const value = new Date(dateStr);
  return Number.isNaN(value.getTime()) ? null : value;
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function validateScheduleInput({ yearKey, moduleName, midExamDate, finalExamDate }) {
  if (!YEAR_KEYS.includes(yearKey)) {
    return 'Invalid year key';
  }

  if (!moduleName || typeof moduleName !== 'string' || !moduleName.trim()) {
    return 'Module name is required';
  }

  const parsedMid = parseDate(midExamDate);
  const parsedFinal = parseDate(finalExamDate);

  if (!parsedMid || !parsedFinal) {
    return 'Valid mid and final exam dates are required';
  }

  const today = startOfDay(new Date());
  const midDay = startOfDay(parsedMid);
  const finalDay = startOfDay(parsedFinal);

  if (midDay < today || finalDay < today) {
    return 'Past exam dates are not allowed';
  }

  if (finalDay < midDay) {
    return 'Final exam date cannot be earlier than mid exam date';
  }

  return null;
}

router.get('/exam-schedules', auth, async (req, res) => {
  try {
    const schedules = await ExamSchedule.find()
      .sort({ midExamDate: 1 })
      .populate('createdBy', 'username');

    res.json(schedules);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/exam-schedules', auth, async (req, res) => {
  try {
    const { yearKey, moduleName, midExamDate, finalExamDate } = req.body;
    const validationMessage = validateScheduleInput({ yearKey, moduleName, midExamDate, finalExamDate });
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const parsedMid = parseDate(midExamDate);
    const parsedFinal = parseDate(finalExamDate);

    const schedule = await ExamSchedule.create({
      yearKey,
      moduleName: moduleName.trim(),
      midExamDate: parsedMid,
      finalExamDate: parsedFinal,
      createdBy: req.user.id,
    });

    await schedule.populate('createdBy', 'username');
    res.status(201).json(schedule);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/exam-schedules/:id', auth, async (req, res) => {
  try {
    const { yearKey, moduleName, midExamDate, finalExamDate } = req.body;
    const validationMessage = validateScheduleInput({ yearKey, moduleName, midExamDate, finalExamDate });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const schedule = await ExamSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }

    schedule.yearKey = yearKey;
    schedule.moduleName = moduleName.trim();
    schedule.midExamDate = parseDate(midExamDate);
    schedule.finalExamDate = parseDate(finalExamDate);

    await schedule.save();
    await schedule.populate('createdBy', 'username');

    res.json(schedule);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/exam-schedules/:id', auth, async (req, res) => {
  try {
    const schedule = await ExamSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }

    await schedule.deleteOne();
    res.json({ message: 'Exam schedule deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
