const express = require('express');
const auth = require('../middleware/auth');
const LectureSchedule = require('../models/LectureSchedule');

const router = express.Router();
const YEAR_KEYS = ['year1', 'year2', 'year3', 'year4'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(timeStr) {
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  return (hours * 60) + minutes;
}

function validateInput({ yearKey, moduleName, lectureDay, lectureStartTime, lectureEndTime, location }) {
  if (!YEAR_KEYS.includes(yearKey)) return 'Invalid year key';
  if (!moduleName || typeof moduleName !== 'string' || !moduleName.trim()) return 'Module name is required';
  if (!DAYS.includes(lectureDay)) return 'A valid lecture day is required';
  if (!lectureStartTime || typeof lectureStartTime !== 'string' || !TIME_PATTERN.test(lectureStartTime)) {
    return 'A valid lecture start time is required';
  }
  if (!lectureEndTime || typeof lectureEndTime !== 'string' || !TIME_PATTERN.test(lectureEndTime)) {
    return 'A valid lecture end time is required';
  }
  if (timeToMinutes(lectureEndTime) <= timeToMinutes(lectureStartTime)) {
    return 'Lecture end time must be after start time';
  }
  if (!location || typeof location !== 'string' || !location.trim()) return 'Location is required';

  return null;
}

router.get('/lecture-schedules', auth, async (req, res) => {
  try {
    const schedules = await LectureSchedule.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username');

    res.json(schedules);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/lecture-schedules', auth, async (req, res) => {
  try {
    const { yearKey, moduleName, lectureDay, lectureStartTime, lectureEndTime, location } = req.body;
    const validationMessage = validateInput({
      yearKey,
      moduleName,
      lectureDay,
      lectureStartTime,
      lectureEndTime,
      location,
    });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const schedule = await LectureSchedule.create({
      yearKey,
      moduleName: moduleName.trim(),
      lectureDay,
      lectureStartTime: lectureStartTime.trim(),
      lectureEndTime: lectureEndTime.trim(),
      timeSlot: `${lectureStartTime.trim()} - ${lectureEndTime.trim()}`,
      location: location.trim(),
      createdBy: req.user.id,
    });

    await schedule.populate('createdBy', 'username');
    res.status(201).json(schedule);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/lecture-schedules/:id', auth, async (req, res) => {
  try {
    const schedule = await LectureSchedule.findOne({ _id: req.params.id, createdBy: req.user.id });

    if (!schedule) {
      return res.status(404).json({ message: 'Lecture schedule not found' });
    }

    const { yearKey, moduleName, lectureDay, lectureStartTime, lectureEndTime, location } = req.body;
    const validationMessage = validateInput({
      yearKey,
      moduleName,
      lectureDay,
      lectureStartTime,
      lectureEndTime,
      location,
    });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    schedule.yearKey = yearKey;
    schedule.moduleName = moduleName.trim();
    schedule.lectureDay = lectureDay;
    schedule.lectureStartTime = lectureStartTime.trim();
    schedule.lectureEndTime = lectureEndTime.trim();
    schedule.timeSlot = `${lectureStartTime.trim()} - ${lectureEndTime.trim()}`;
    schedule.location = location.trim();
    await schedule.save();
    await schedule.populate('createdBy', 'username');

    res.json(schedule);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/lecture-schedules/:id', auth, async (req, res) => {
  try {
    const schedule = await LectureSchedule.findOne({ _id: req.params.id, createdBy: req.user.id });

    if (!schedule) {
      return res.status(404).json({ message: 'Lecture schedule not found' });
    }

    await schedule.deleteOne();
    res.json({ message: 'Lecture schedule deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
