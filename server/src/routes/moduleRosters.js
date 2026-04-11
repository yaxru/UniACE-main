const express = require('express');
const auth = require('../middleware/auth');
const ModuleRoster = require('../models/ModuleRoster');
const User = require('../models/User');

const router = express.Router();
const YEAR_KEYS = ['year1', 'year2', 'year3', 'year4'];
const LIST_TYPES = ['student', 'lecturer'];

function getListTypeLabel(listType) {
  return listType === 'lecturer' ? 'lecturer' : 'student';
}

function sanitizeRows(rows, listType) {
  if (!Array.isArray(rows)) return null;

  const sanitized = rows
    .map((row) => ({
      studentName: typeof row.studentName === 'string' ? row.studentName.trim() : '',
      itNumber: typeof row.itNumber === 'string' ? row.itNumber.trim() : '',
      groupNo: typeof row.groupNo === 'string' ? row.groupNo.trim() : '',
      groupName: typeof row.groupName === 'string' ? row.groupName.trim() : '',
      availableDates: typeof row.availableDates === 'string' ? row.availableDates.trim() : '',
      timeSlots: typeof row.timeSlots === 'string' ? row.timeSlots.trim() : '',
    }))
    .filter((row) => {
      if (!row.studentName || !row.itNumber) return false;
      if (listType === 'lecturer') {
        return row.availableDates && row.timeSlots;
      }
      return row.groupNo && row.groupName;
    })
    .slice(0, 2000);

  return sanitized;
}

function getModuleKey(yearKey, moduleName) {
  return `${yearKey}::${String(moduleName || '').trim().toLowerCase()}`;
}

function buildEvaluationGroups(studentRows, lecturerRows) {
  const grouped = new Map();
  const lecturers = (lecturerRows || []).filter((item) => item.studentName && item.itNumber);

  for (const student of studentRows || []) {
    const groupNo = String(student.groupNo || '').trim();
    const groupName = String(student.groupName || '').trim();
    if (!groupNo || !groupName) continue;

    const key = `${groupNo}::${groupName.toLowerCase()}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        groupNo,
        groupName,
        students: [],
      });
    }

    grouped.get(key).students.push({
      studentName: student.studentName,
      itNumber: student.itNumber,
    });
  }

  const groups = Array.from(grouped.values()).sort((a, b) => {
    const byGroupNo = String(a.groupNo).localeCompare(String(b.groupNo), undefined, { numeric: true });
    if (byGroupNo !== 0) return byGroupNo;
    return String(a.groupName).localeCompare(String(b.groupName));
  });

  return groups.map((group, index) => ({
    ...group,
    evaluator: lecturers.length > 0
      ? {
        studentName: lecturers[index % lecturers.length].studentName,
        itNumber: lecturers[index % lecturers.length].itNumber,
        availableDates: lecturers[index % lecturers.length].availableDates,
        timeSlots: lecturers[index % lecturers.length].timeSlots,
      }
      : null,
  }));
}

router.post('/module-rosters', auth, async (req, res) => {
  try {
    const { yearKey, moduleName, sourceFileName, rows, listType = 'student' } = req.body;

    if (!YEAR_KEYS.includes(yearKey)) {
      return res.status(400).json({ message: 'Invalid year key' });
    }

    if (!moduleName || typeof moduleName !== 'string' || !moduleName.trim()) {
      return res.status(400).json({ message: 'Module name is required' });
    }

    if (!sourceFileName || typeof sourceFileName !== 'string' || !sourceFileName.trim()) {
      return res.status(400).json({ message: 'Source file name is required' });
    }

    if (!LIST_TYPES.includes(listType)) {
      return res.status(400).json({ message: 'Invalid list type' });
    }

    const sanitizedRows = sanitizeRows(rows, listType);
    if (!sanitizedRows || sanitizedRows.length === 0) {
      const listTypeLabel = getListTypeLabel(listType);
      const requiredTail = listType === 'lecturer'
        ? 'available dates, time slots'
        : 'group no, group name';
      return res.status(400).json({
        message: `No valid rows found. Expected columns: ${listTypeLabel} name, IT number, ${requiredTail}.`,
      });
    }

    const roster = await ModuleRoster.create({
      listType,
      yearKey,
      moduleName: moduleName.trim(),
      sourceFileName: sourceFileName.trim(),
      rows: sanitizedRows,
      uploadedBy: req.user.id,
    });

    res.status(201).json(roster);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/module-rosters/latest', auth, async (req, res) => {
  try {
    const yearKey = typeof req.query.yearKey === 'string' ? req.query.yearKey : '';
    const moduleName = typeof req.query.moduleName === 'string' ? req.query.moduleName.trim() : '';
    const listType = typeof req.query.listType === 'string' ? req.query.listType : 'student';

    if (!YEAR_KEYS.includes(yearKey)) {
      return res.status(400).json({ message: 'Invalid year key' });
    }

    if (!moduleName) {
      return res.status(400).json({ message: 'Module name is required' });
    }

    if (!LIST_TYPES.includes(listType)) {
      return res.status(400).json({ message: 'Invalid list type' });
    }

    const roster = await ModuleRoster.findOne({ listType, yearKey, moduleName })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username');

    if (!roster) {
      return res.json(null);
    }

    res.json(roster);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/module-rosters/evaluation-groups/selected', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('modulesByYear');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const modulesByYear = user.modulesByYear || {};
    const selectedModules = [];
    const selectedKeySet = new Set();

    for (const yearKey of YEAR_KEYS) {
      const modules = Array.isArray(modulesByYear[yearKey]) ? modulesByYear[yearKey] : [];
      for (const moduleNameRaw of modules) {
        const moduleName = String(moduleNameRaw || '').trim();
        if (!moduleName) continue;
        const key = getModuleKey(yearKey, moduleName);
        if (selectedKeySet.has(key)) continue;
        selectedKeySet.add(key);
        selectedModules.push({ yearKey, moduleName, key });
      }
    }

    if (selectedModules.length === 0) {
      return res.json([]);
    }

    const moduleOrFilters = selectedModules.map((item) => ({
      yearKey: item.yearKey,
      moduleName: item.moduleName,
    }));

    const rosters = await ModuleRoster.find({
      listType: { $in: LIST_TYPES },
      $or: moduleOrFilters,
    })
      .sort({ createdAt: -1 })
      .lean();

    const latestStudentByKey = new Map();
    const latestLecturerByKey = new Map();

    for (const roster of rosters) {
      const key = getModuleKey(roster.yearKey, roster.moduleName);
      if (!selectedKeySet.has(key)) continue;

      if (roster.listType === 'student' && !latestStudentByKey.has(key)) {
        latestStudentByKey.set(key, roster);
      }

      if (roster.listType === 'lecturer' && !latestLecturerByKey.has(key)) {
        latestLecturerByKey.set(key, roster);
      }
    }

    const response = selectedModules
      .map((item) => {
        const studentRoster = latestStudentByKey.get(item.key) || null;
        const lecturerRoster = latestLecturerByKey.get(item.key) || null;
        const groups = buildEvaluationGroups(studentRoster?.rows || [], lecturerRoster?.rows || []);

        return {
          yearKey: item.yearKey,
          moduleName: item.moduleName,
          groups,
          hasStudentRoster: !!studentRoster,
          hasLecturerRoster: !!lecturerRoster,
        };
      })
      .sort((a, b) => {
        const yearCompare = YEAR_KEYS.indexOf(a.yearKey) - YEAR_KEYS.indexOf(b.yearKey);
        if (yearCompare !== 0) return yearCompare;
        return a.moduleName.localeCompare(b.moduleName);
      });

    res.json(response);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
