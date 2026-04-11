import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const YEARS = [
  { value: 'year1', label: 'Year 1' },
  { value: 'year2', label: 'Year 2' },
  { value: 'year3', label: 'Year 3' },
  { value: 'year4', label: 'Year 4' },
];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function sortDateStrings(values) {
  return [...values].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

function getLocalDate(dateStr) {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
}

function getTimeSortValue(timeSlot) {
  const match = String(timeSlot || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = String(match[3] || '').toUpperCase();

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return (hours * 60) + minutes;
}

function parseTimeTo24h(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  match = raw.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
  if (!match) return '';

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = String(match[3]).toUpperCase();

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function formatPlannerTimeLabel(timeSlot) {
  const raw = String(timeSlot || '').trim();
  if (!raw) return '-';

  const parts = raw.split('-').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2) {
    const start = parseTimeTo24h(parts[0]);
    const end = parseTimeTo24h(parts[1]);
    if (start && end) return `${start} - ${end}`;
  }

  const single = parseTimeTo24h(raw);
  return single || raw;
}

function getExamDisplayTime(item) {
  const start = String(item?.examStartTime || '').trim();
  const end = String(item?.examEndTime || '').trim();
  if (start && end) return `${start} - ${end}`;
  return String(item?.examTimeSlot || '').trim();
}

function getLectureDisplayTime(item) {
  const start = String(item?.lectureStartTime || '').trim();
  const end = String(item?.lectureEndTime || '').trim();
  if (start && end) return `${start} - ${end}`;
  return String(item?.timeSlot || '').trim();
}

function getExamPrepDays(studyPreference) {
  if (studyPreference === 'hard') return 10;
  if (studyPreference === 'easy') return 2;
  return 3;
}

function getAssignmentLeadDays(studyPreference) {
  if (studyPreference === 'hard') return 10;
  if (studyPreference === 'easy') return 5;
  return 7;
}

function normalizeTimeForInput(timeStr) {
  if (!timeStr) return '';
  const raw = String(timeStr).trim();
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;

  const match = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return '';

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = String(match[3]).toUpperCase();

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function toInputDate(dateStr) {
  const parsed = getLocalDate(dateStr);
  if (!parsed) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidTimeRange(start, end) {
  const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!TIME_PATTERN.test(String(start || '').trim()) || !TIME_PATTERN.test(String(end || '').trim())) {
    return false;
  }
  return getTimeSortValue(end) > getTimeSortValue(start);
}

function getModuleKey(yearKey, moduleName) {
  return `${yearKey}::${String(moduleName || '').trim().toLowerCase()}`;
}

export default function TimetablePage() {
  const { user, updateUser } = useAuth();
  const isLicUser = String(user?.itNumber || '').trim().toUpperCase().startsWith('LIC');
  const emptyLectureForm = {
    yearKey: 'year1',
    moduleName: '',
    lectureDay: '',
    lectureStartTime: '',
    lectureEndTime: '',
    location: '',
  };

  const LECTURE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modulesByYear, setModulesByYear] = useState(user?.modulesByYear || {});
  const [midEntries, setMidEntries] = useState([]);
  const [finalEntries, setFinalEntries] = useState([]);
  const [assignmentEntries, setAssignmentEntries] = useState([]);
  const [lectureEntries, setLectureEntries] = useState([]);
  const [lectureForm, setLectureForm] = useState({ ...emptyLectureForm });
  const [savingLecture, setSavingLecture] = useState(false);
  const [editingLectureId, setEditingLectureId] = useState(null);
  const [plannerView, setPlannerView] = useState('list');
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);
  const [customStudyPlans, setCustomStudyPlans] = useState([]);
  const [plannerModal, setPlannerModal] = useState(null);
  const [plannerModalSaving, setPlannerModalSaving] = useState(false);
  const [plannerConfirm, setPlannerConfirm] = useState(null);
  const studyPlanStorageKey = `quizbee-study-plan:${String(user?.id || 'anon')}`;

  const lectureModules = Array.isArray(modulesByYear?.[lectureForm.yearKey])
    ? modulesByYear[lectureForm.yearKey].filter(Boolean)
    : [];

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(studyPlanStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setCustomStudyPlans(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCustomStudyPlans([]);
    }
  }, [studyPlanStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(studyPlanStorageKey, JSON.stringify(customStudyPlans));
    } catch {
      // ignore storage write issues
    }
  }, [customStudyPlans, studyPlanStorageKey]);

  async function fetchAllData() {
    setLoading(true);
    setError('');

    try {
      const [profileRes, midRes, finalRes, assignmentRes, lectureRes] = await Promise.all([
        api.get('/profile'),
        api.get('/exam-date-entries', { params: { examType: 'mid' } }),
        api.get('/exam-date-entries', { params: { examType: 'final' } }),
        api.get('/assignment-schedules'),
        api.get('/lecture-schedules'),
      ]);

      const nextModulesByYear = profileRes.data?.modulesByYear || {};
      setModulesByYear(nextModulesByYear);
      setMidEntries(Array.isArray(midRes.data) ? midRes.data : []);
      setFinalEntries(Array.isArray(finalRes.data) ? finalRes.data : []);
      setAssignmentEntries(Array.isArray(assignmentRes.data) ? assignmentRes.data : []);
      setLectureEntries(Array.isArray(lectureRes.data) ? lectureRes.data : []);

      updateUser({
        ...(user || {}),
        name: profileRes.data?.name,
        phone: profileRes.data?.phone,
        itNumber: profileRes.data?.itNumber,
        role: profileRes.data?.role,
        modulesByYear: nextModulesByYear,
      });
    } catch {
      setError('Failed to load timetable details.');
    } finally {
      setLoading(false);
    }
  }

  const timetableRows = useMemo(() => {
    const followedMap = new Map();
    const yearLabelByKey = Object.fromEntries(YEARS.map((y) => [y.value, y.label]));

    function addFollowed(yearKey, moduleName) {
      const normalizedModule = String(moduleName || '').trim();
      if (!yearKey || !normalizedModule) return;

      const rowKey = getModuleKey(yearKey, normalizedModule);
      if (!followedMap.has(rowKey)) {
        followedMap.set(rowKey, {
          yearKey,
          yearLabel: yearLabelByKey[yearKey] || yearKey,
          moduleName: normalizedModule,
          key: rowKey,
        });
      }
    }

    for (const year of YEARS) {
      const modules = Array.isArray(modulesByYear?.[year.value]) ? modulesByYear[year.value] : [];
      for (const moduleName of modules) {
        addFollowed(year.value, moduleName);
      }
    }

    for (const item of midEntries) {
      addFollowed(item.yearKey, item.moduleName);
    }

    for (const item of finalEntries) {
      addFollowed(item.yearKey, item.moduleName);
    }

    for (const item of assignmentEntries) {
      addFollowed(item.yearKey, item.moduleName);
    }

    for (const item of lectureEntries) {
      addFollowed(item.yearKey, item.moduleName);
    }

    const followed = Array.from(followedMap.values());

    const midByModule = new Map();
    const finalByModule = new Map();
    const assignmentByModule = new Map();
    const lectureByModule = new Map();

    for (const item of midEntries) {
      const key = getModuleKey(item.yearKey, item.moduleName);
      if (!midByModule.has(key)) midByModule.set(key, []);
      midByModule.get(key).push({
        _id: item._id,
        examType: item.examType,
        yearKey: item.yearKey,
        moduleName: item.moduleName,
        examDate: item.examDate,
        studyPreference: item.studyPreference,
        examStartTime: item.examStartTime,
        examEndTime: item.examEndTime,
        examTimeSlot: getExamDisplayTime(item),
      });
    }

    for (const item of finalEntries) {
      const key = getModuleKey(item.yearKey, item.moduleName);
      if (!finalByModule.has(key)) finalByModule.set(key, []);
      finalByModule.get(key).push({
        _id: item._id,
        examType: item.examType,
        yearKey: item.yearKey,
        moduleName: item.moduleName,
        examDate: item.examDate,
        studyPreference: item.studyPreference,
        examStartTime: item.examStartTime,
        examEndTime: item.examEndTime,
        examTimeSlot: getExamDisplayTime(item),
      });
    }

    for (const item of assignmentEntries) {
      const key = getModuleKey(item.yearKey, item.moduleName);
      if (!assignmentByModule.has(key)) assignmentByModule.set(key, []);
      assignmentByModule.get(key).push({
        _id: item._id,
        yearKey: item.yearKey,
        moduleName: item.moduleName,
        assignmentName: item.assignmentName,
        dueDate: item.dueDate,
        timeSlot: item.timeSlot,
        progress: item.progress,
        studyPreference: item.studyPreference,
      });
    }

    for (const item of lectureEntries) {
      const key = getModuleKey(item.yearKey, item.moduleName);
      if (!lectureByModule.has(key)) lectureByModule.set(key, []);
      lectureByModule.get(key).push({
        _id: item._id,
        lectureDay: item.lectureDay,
        lectureStartTime: item.lectureStartTime,
        lectureEndTime: item.lectureEndTime,
        timeSlot: getLectureDisplayTime(item),
        location: item.location,
      });
    }

    return followed.map((row) => {
      const midDates = [...(midByModule.get(row.key) || [])]
        .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
      const finalDates = [...(finalByModule.get(row.key) || [])]
        .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
      const assignments = [...(assignmentByModule.get(row.key) || [])]
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const lectures = [...(lectureByModule.get(row.key) || [])]
        .sort((a, b) => DAY_ORDER.indexOf(a.lectureDay) - DAY_ORDER.indexOf(b.lectureDay));

      return {
        ...row,
        midDates,
        finalDates,
        assignments,
        lectures,
      };
    });
  }, [modulesByYear, midEntries, finalEntries, assignmentEntries, lectureEntries]);

  const dailyPlanner = useMemo(() => {
    const todayName = new Date().toLocaleDateString(undefined, { weekday: 'long' });
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const lookAheadEnd = new Date(todayStart);
    lookAheadEnd.setDate(lookAheadEnd.getDate() + 21);
    const grouped = new Map(LECTURE_DAYS.map((day) => [day, []]));

    for (const row of timetableRows) {
      for (const lecture of row.lectures) {
        grouped.get(lecture.lectureDay)?.push({
          id: lecture._id,
          type: 'lecture',
          lectureDay: lecture.lectureDay,
          timeSlot: lecture.timeSlot,
          location: lecture.location,
          moduleName: row.moduleName,
          yearLabel: row.yearLabel,
          yearKey: row.yearKey,
          lectureStartTime: lecture.lectureStartTime,
          lectureEndTime: lecture.lectureEndTime,
        });
      }

      for (const midItem of row.midDates) {
        const localDate = getLocalDate(midItem.examDate);
        if (!localDate || localDate < todayStart || localDate > lookAheadEnd) continue;

        const examPrepDays = getExamPrepDays(midItem.studyPreference);

        for (let offset = examPrepDays; offset >= 1; offset -= 1) {
          const prepDate = new Date(localDate);
          prepDate.setDate(prepDate.getDate() - offset);
          if (prepDate < todayStart || prepDate > lookAheadEnd) continue;

          const weekday = prepDate.toLocaleDateString(undefined, { weekday: 'long' });
          grouped.get(weekday)?.push({
            id: `mid-study-${row.key}-${midItem.examDate}-${offset}`,
            type: 'study-exam',
            timeSlot: midItem.examTimeSlot || '18:00 - 19:30',
            moduleName: row.moduleName,
            yearLabel: row.yearLabel,
            examLabel: `Focus: Study for Exam (${offset} day${offset === 1 ? '' : 's'} left)`,
            plannedDate: prepDate.toISOString(),
            targetDate: midItem.examDate,
            targetLabel: 'Exam Date',
            sourceId: midItem._id,
            examType: midItem.examType,
            yearKey: midItem.yearKey,
            examStartTime: midItem.examStartTime,
            examEndTime: midItem.examEndTime,
            studyPreference: midItem.studyPreference || 'neutral',
          });
        }
      }

      for (const finalItem of row.finalDates) {
        const localDate = getLocalDate(finalItem.examDate);
        if (!localDate || localDate < todayStart || localDate > lookAheadEnd) continue;

        const examPrepDays = getExamPrepDays(finalItem.studyPreference);

        for (let offset = examPrepDays; offset >= 1; offset -= 1) {
          const prepDate = new Date(localDate);
          prepDate.setDate(prepDate.getDate() - offset);
          if (prepDate < todayStart || prepDate > lookAheadEnd) continue;

          const weekday = prepDate.toLocaleDateString(undefined, { weekday: 'long' });
          grouped.get(weekday)?.push({
            id: `final-study-${row.key}-${finalItem.examDate}-${offset}`,
            type: 'study-exam',
            timeSlot: finalItem.examTimeSlot || '19:30 - 21:30',
            moduleName: row.moduleName,
            yearLabel: row.yearLabel,
            examLabel: `Focus: Study for Exam (${offset} day${offset === 1 ? '' : 's'} left)`,
            plannedDate: prepDate.toISOString(),
            targetDate: finalItem.examDate,
            targetLabel: 'Exam Date',
            sourceId: finalItem._id,
            examType: finalItem.examType,
            yearKey: finalItem.yearKey,
            examStartTime: finalItem.examStartTime,
            examEndTime: finalItem.examEndTime,
            studyPreference: finalItem.studyPreference || 'neutral',
          });
        }
      }

      for (const assignment of row.assignments) {
        const localDate = getLocalDate(assignment.dueDate);
        const isCompleted = (assignment.progress || 'Not Started') === 'Completed';

        if (isCompleted) continue;

        if (!localDate || localDate < todayStart) continue;

        const assignmentLeadDays = getAssignmentLeadDays(assignment.studyPreference);

        const startDate = new Date(localDate);
        startDate.setDate(startDate.getDate() - assignmentLeadDays);
        if (startDate < todayStart || startDate > lookAheadEnd) continue;

        const weekday = startDate.toLocaleDateString(undefined, { weekday: 'long' });
        grouped.get(weekday)?.push({
          id: `assignment-start-${row.key}-${assignment.assignmentName}-${assignment.dueDate}`,
          type: 'study-assignment',
          timeSlot: assignment.timeSlot || '5:00 PM - 6:30 PM',
          moduleName: row.moduleName,
          yearLabel: row.yearLabel,
          examLabel: `Focus: Start ${assignment.assignmentName} (${assignmentLeadDays} days before deadline)`,
          plannedDate: startDate.toISOString(),
          targetDate: assignment.dueDate,
          targetLabel: 'Due Date',
          sourceId: assignment._id,
          yearKey: assignment.yearKey,
          assignmentName: assignment.assignmentName,
          studyPreference: assignment.studyPreference || 'neutral',
        });
      }
    }

    for (const customItem of customStudyPlans) {
      const plannedDate = getLocalDate(customItem.plannedDate);
      if (!plannedDate || plannedDate < todayStart || plannedDate > lookAheadEnd) continue;

      const weekday = plannedDate.toLocaleDateString(undefined, { weekday: 'long' });
      grouped.get(weekday)?.push({
        ...customItem,
        id: customItem.id,
        isCustom: true,
        plannedDate: plannedDate.toISOString(),
        targetDate: customItem.targetDate || plannedDate.toISOString(),
        targetLabel: customItem.targetLabel || 'Study Date',
      });
    }

    return LECTURE_DAYS.map((day) => ({
      day,
      isToday: day === todayName,
      entries: (grouped.get(day) || [])
        .filter((item) => {
          if (!item.targetDate) return true;
          const deadline = getLocalDate(item.targetDate);
          return deadline && deadline >= todayStart;
        })
        .sort((a, b) => getTimeSortValue(a.timeSlot) - getTimeSortValue(b.timeSlot)),
    }));
  }, [LECTURE_DAYS, timetableRows, customStudyPlans]);

  const plannerCalendarDays = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const currentWeekday = today.getDay();
    const mondayOffset = currentWeekday === 0 ? -6 : 1 - currentWeekday;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    monday.setDate(monday.getDate() + mondayOffset + (calendarWeekOffset * 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dayName = date.toLocaleDateString(undefined, { weekday: 'long' });
      const isToday =
        date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate();

      return {
        key: `${dayName}-${date.toISOString()}`,
        dayName,
        date,
        dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        isToday,
        entries: [],
      };
    });

    const dayByName = new Map(days.map((d) => [d.dayName, d]));

    function inCurrentWeek(localDate) {
      return localDate >= monday && localDate <= sunday;
    }

    for (const row of timetableRows) {
      for (const lecture of row.lectures) {
        const dayBucket = dayByName.get(lecture.lectureDay);
        if (!dayBucket) continue;

        dayBucket.entries.push({
          id: `${lecture._id}-${dayBucket.date.toISOString()}`,
          type: 'lecture',
          timeSlot: lecture.timeSlot,
          moduleName: row.moduleName,
          yearLabel: row.yearLabel,
          location: lecture.location,
          lectureId: lecture._id,
          yearKey: row.yearKey,
          lectureDay: lecture.lectureDay,
          lectureStartTime: lecture.lectureStartTime,
          lectureEndTime: lecture.lectureEndTime,
        });
      }

      for (const midItem of row.midDates) {
        const examDate = getLocalDate(midItem.examDate);
        if (!examDate || examDate < todayStart) continue;

        const examPrepDays = getExamPrepDays(midItem.studyPreference);

        for (let offset = examPrepDays; offset >= 1; offset -= 1) {
          const prepDate = new Date(examDate);
          prepDate.setDate(prepDate.getDate() - offset);
          if (!inCurrentWeek(prepDate)) continue;

          const dayName = prepDate.toLocaleDateString(undefined, { weekday: 'long' });
          const dayBucket = dayByName.get(dayName);
          if (!dayBucket) continue;

          dayBucket.entries.push({
            id: `mid-calendar-${row.key}-${midItem.examDate}-${offset}`,
            type: 'study-exam',
            timeSlot: midItem.examTimeSlot || '18:00 - 19:30',
            moduleName: row.moduleName,
            yearLabel: row.yearLabel,
            examLabel: `Focus: Study for Exam (${offset} day${offset === 1 ? '' : 's'} left)`,
            targetDate: midItem.examDate,
            targetLabel: 'Exam Date',
            plannedDate: prepDate.toISOString(),
            sourceId: midItem._id,
            examType: midItem.examType,
            yearKey: midItem.yearKey,
            examStartTime: midItem.examStartTime,
            examEndTime: midItem.examEndTime,
            studyPreference: midItem.studyPreference || 'neutral',
          });
        }
      }

      for (const finalItem of row.finalDates) {
        const examDate = getLocalDate(finalItem.examDate);
        if (!examDate || examDate < todayStart) continue;

        const examPrepDays = getExamPrepDays(finalItem.studyPreference);

        for (let offset = examPrepDays; offset >= 1; offset -= 1) {
          const prepDate = new Date(examDate);
          prepDate.setDate(prepDate.getDate() - offset);
          if (!inCurrentWeek(prepDate)) continue;

          const dayName = prepDate.toLocaleDateString(undefined, { weekday: 'long' });
          const dayBucket = dayByName.get(dayName);
          if (!dayBucket) continue;

          dayBucket.entries.push({
            id: `final-calendar-${row.key}-${finalItem.examDate}-${offset}`,
            type: 'study-exam',
            timeSlot: finalItem.examTimeSlot || '19:30 - 21:30',
            moduleName: row.moduleName,
            yearLabel: row.yearLabel,
            examLabel: `Focus: Study for Exam (${offset} day${offset === 1 ? '' : 's'} left)`,
            targetDate: finalItem.examDate,
            targetLabel: 'Exam Date',
            plannedDate: prepDate.toISOString(),
            sourceId: finalItem._id,
            examType: finalItem.examType,
            yearKey: finalItem.yearKey,
            examStartTime: finalItem.examStartTime,
            examEndTime: finalItem.examEndTime,
            studyPreference: finalItem.studyPreference || 'neutral',
          });
        }
      }

      for (const assignment of row.assignments) {
        const dueDate = getLocalDate(assignment.dueDate);
        const isCompleted = (assignment.progress || 'Not Started') === 'Completed';
        if (!dueDate || dueDate < todayStart || isCompleted) continue;

        const assignmentLeadDays = getAssignmentLeadDays(assignment.studyPreference);

        const startDate = new Date(dueDate);
        startDate.setDate(startDate.getDate() - assignmentLeadDays);
        if (!inCurrentWeek(startDate)) continue;

        const dayName = startDate.toLocaleDateString(undefined, { weekday: 'long' });
        const dayBucket = dayByName.get(dayName);
        if (!dayBucket) continue;

        dayBucket.entries.push({
          id: `assignment-calendar-${row.key}-${assignment.assignmentName}-${assignment.dueDate}`,
          type: 'study-assignment',
          timeSlot: assignment.timeSlot || '5:00 PM - 6:30 PM',
          moduleName: row.moduleName,
          yearLabel: row.yearLabel,
          examLabel: `Focus: Start ${assignment.assignmentName} (${assignmentLeadDays} days before deadline)`,
          targetDate: assignment.dueDate,
          targetLabel: 'Due Date',
          plannedDate: startDate.toISOString(),
          sourceId: assignment._id,
          yearKey: assignment.yearKey,
          assignmentName: assignment.assignmentName,
          studyPreference: assignment.studyPreference || 'neutral',
        });
      }
    }

    for (const customItem of customStudyPlans) {
      const plannedDate = getLocalDate(customItem.plannedDate);
      if (!plannedDate || !inCurrentWeek(plannedDate)) continue;

      const dayName = plannedDate.toLocaleDateString(undefined, { weekday: 'long' });
      const dayBucket = dayByName.get(dayName);
      if (!dayBucket) continue;

      dayBucket.entries.push({
        ...customItem,
        id: customItem.id,
        isCustom: true,
        targetDate: customItem.targetDate || plannedDate.toISOString(),
        targetLabel: customItem.targetLabel || 'Study Date',
        plannedDate: plannedDate.toISOString(),
      });
    }

    const weekLabel = `${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

    for (const day of days) {
      day.entries = day.entries.sort((a, b) => getTimeSortValue(a.timeSlot) - getTimeSortValue(b.timeSlot));
    }

    return { days, weekLabel };
  }, [calendarWeekOffset, timetableRows, customStudyPlans]);

  function handleLectureChange(e) {
    const { name, value } = e.target;

    if (name === 'yearKey') {
      const nextModules = Array.isArray(modulesByYear?.[value]) ? modulesByYear[value].filter(Boolean) : [];
      setLectureForm((prev) => ({
        ...prev,
        yearKey: value,
        moduleName: nextModules.includes(prev.moduleName) ? prev.moduleName : '',
      }));
      return;
    }

    setLectureForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEditLecture(item) {
    const slotParts = String(item.timeSlot || '').split('-').map((part) => normalizeTimeForInput(part.trim()));
    const slotStart = slotParts[0] || '';
    const slotEnd = slotParts[1] || '';
    setEditingLectureId(item._id);
    setLectureForm({
      yearKey: item.yearKey,
      moduleName: item.moduleName,
      lectureDay: item.lectureDay,
      lectureStartTime: normalizeTimeForInput(item.lectureStartTime) || slotStart,
      lectureEndTime: normalizeTimeForInput(item.lectureEndTime) || slotEnd,
      location: item.location,
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingLectureId(null);
    setLectureForm({ ...emptyLectureForm });
    setError('');
    setSuccess('');
  }

  async function handleAddLecture(e) {
    e.preventDefault();
    setSavingLecture(true);
    setError('');
    setSuccess('');

    const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    try {
      if (editingLectureId) {
        const { data } = await api.put(`/lecture-schedules/${editingLectureId}`, lectureForm);
        setLectureEntries((prev) =>
          prev
            .map((entry) => (entry._id === editingLectureId ? data : entry))
            .sort((a, b) => DAY_ORDER.indexOf(a.lectureDay) - DAY_ORDER.indexOf(b.lectureDay))
        );
        setEditingLectureId(null);
        setLectureForm({ ...emptyLectureForm });
        setSuccess('Lecture schedule updated successfully.');
      } else {
        const { data } = await api.post('/lecture-schedules', lectureForm);
        setLectureEntries((prev) => {
          const next = [...prev, data];
          return next.sort((a, b) => DAY_ORDER.indexOf(a.lectureDay) - DAY_ORDER.indexOf(b.lectureDay));
        });
        setLectureForm({ ...emptyLectureForm });
        setSuccess('Lecture schedule added successfully.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save lecture schedule.');
    } finally {
      setSavingLecture(false);
    }
  }

  function closePlannerModal() {
    setPlannerModal(null);
    setPlannerModalSaving(false);
  }

  function requestPlannerDelete(action, payload, message) {
    setPlannerConfirm({ action, payload, message });
  }

  async function handleDeleteLecture(lectureId) {
    requestPlannerDelete('delete-lecture', { lectureId }, 'Delete this lecture schedule?');
  }

  async function handleDeleteStudyExam(item) {
    if (!item?.sourceId) {
      setError('Cannot delete this exam record. Missing source details.');
      return;
    }
    requestPlannerDelete('delete-study-exam', { item }, 'Delete this exam date entry?');
  }

  function handleEditStudyExam(item) {
    if (!item?.sourceId) {
      setError('Cannot edit this exam record. Missing source details.');
      return;
    }

    setPlannerModal({
      type: 'study-exam',
      item,
      form: {
        examDate: toInputDate(item.targetDate),
        examStartTime: normalizeTimeForInput(item.examStartTime),
        examEndTime: normalizeTimeForInput(item.examEndTime),
        studyPreference: item.studyPreference || 'neutral',
      },
    });
  }

  async function handleDeleteStudyAssignment(item) {
    if (!item?.sourceId) {
      setError('Cannot delete this assignment record. Missing source details.');
      return;
    }
    requestPlannerDelete('delete-study-assignment', { item }, 'Delete this assignment schedule?');
  }

  function handleEditStudyAssignment(item) {
    if (!item?.sourceId) {
      setError('Cannot edit this assignment record. Missing source details.');
      return;
    }

    setPlannerModal({
      type: 'study-assignment',
      item,
      form: {
        assignmentName: item.assignmentName || '',
        dueDate: toInputDate(item.targetDate),
        timeSlot: normalizeTimeForInput(item.timeSlot),
        studyPreference: item.studyPreference || 'neutral',
      },
    });
  }

  function handleAddCustomStudyDate() {
    setPlannerModal({
      type: 'custom-study-add',
      form: {
        studyKind: 'exam',
        moduleName: timetableRows[0]?.moduleName || '',
        yearKey: 'year1',
        plannedDate: toInputDate(new Date().toISOString()),
        timeSlot: '18:00 - 19:30',
        note: 'Focus: Custom study for exam',
      },
    });
  }

  function handleEditCustomStudyDate(item) {
    setPlannerModal({
      type: 'custom-study-edit',
      item,
      form: {
        studyKind: item.type === 'study-assignment' ? 'assignment' : 'exam',
        moduleName: item.moduleName || '',
        yearKey: item.yearKey || 'year1',
        plannedDate: toInputDate(item.plannedDate),
        timeSlot: String(item.timeSlot || '').trim(),
        note: String(item.examLabel || '').trim(),
      },
    });
  }

  function handleDeleteCustomStudyDate(item) {
    requestPlannerDelete('delete-custom-study', { item }, 'Delete this custom study date?');
  }

  function updatePlannerModalField(name, value) {
    setPlannerModal((prev) => (prev ? { ...prev, form: { ...prev.form, [name]: value } } : prev));
  }

  async function submitPlannerModal(e) {
    e.preventDefault();
    if (!plannerModal) return;

    const { type, item, form } = plannerModal;
    setPlannerModalSaving(true);
    setError('');
    setSuccess('');

    try {
      if (type === 'study-exam') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(form.examDate).trim())) {
          throw new Error('Invalid exam date format. Use YYYY-MM-DD.');
        }
        if (!isValidTimeRange(String(form.examStartTime).trim(), String(form.examEndTime).trim())) {
          throw new Error('Invalid exam time range. End time must be after start time.');
        }
        if (!['hard', 'easy', 'neutral'].includes(String(form.studyPreference).trim().toLowerCase())) {
          throw new Error('Invalid study preference. Use hard, easy, or neutral.');
        }

        const payload = {
          examType: item.examType,
          yearKey: item.yearKey,
          moduleName: item.moduleName,
          examDate: String(form.examDate).trim(),
          examStartTime: String(form.examStartTime).trim(),
          examEndTime: String(form.examEndTime).trim(),
          studyPreference: String(form.studyPreference).trim().toLowerCase(),
        };

        const { data } = await api.put(`/exam-date-entries/${item.sourceId}`, payload);
        if (item.examType === 'mid') {
          setMidEntries((prev) => prev.map((entry) => (entry._id === item.sourceId ? data : entry)));
        } else {
          setFinalEntries((prev) => prev.map((entry) => (entry._id === item.sourceId ? data : entry)));
        }
        setSuccess('Exam date entry updated successfully.');
      }

      if (type === 'study-assignment') {
        if (!String(form.assignmentName || '').trim()) {
          throw new Error('Assignment name is required.');
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(form.dueDate).trim())) {
          throw new Error('Invalid due date format. Use YYYY-MM-DD.');
        }
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(form.timeSlot).trim())) {
          throw new Error('Invalid time format. Use HH:MM.');
        }
        if (!['hard', 'easy', 'neutral'].includes(String(form.studyPreference).trim().toLowerCase())) {
          throw new Error('Invalid study preference. Use hard, easy, or neutral.');
        }

        const payload = {
          yearKey: item.yearKey,
          moduleName: item.moduleName,
          assignmentName: String(form.assignmentName).trim(),
          dueDate: String(form.dueDate).trim(),
          timeSlot: String(form.timeSlot).trim(),
          studyPreference: String(form.studyPreference).trim().toLowerCase(),
        };

        const { data } = await api.put(`/assignment-schedules/${item.sourceId}`, payload);
        setAssignmentEntries((prev) => prev.map((entry) => (entry._id === item.sourceId ? data : entry)));
        setSuccess('Assignment schedule updated successfully.');
      }

      if (type === 'custom-study-add' || type === 'custom-study-edit') {
        if (!['exam', 'assignment'].includes(String(form.studyKind).trim().toLowerCase())) {
          throw new Error('Invalid study type. Use exam or assignment.');
        }
        if (!String(form.moduleName || '').trim()) {
          throw new Error('Module name is required.');
        }
        if (!YEARS.some((year) => year.value === String(form.yearKey || '').trim().toLowerCase())) {
          throw new Error('Invalid year key. Use year1, year2, year3, or year4.');
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(form.plannedDate).trim())) {
          throw new Error('Invalid date format. Use YYYY-MM-DD.');
        }
        if (!String(form.timeSlot || '').trim()) {
          throw new Error('Study time is required.');
        }

        const yearKey = String(form.yearKey).trim().toLowerCase();
        const studyKind = String(form.studyKind).trim().toLowerCase();
        const nextItem = {
          id: type === 'custom-study-edit' ? item.id : `custom-study-${Date.now()}-${Math.round(Math.random() * 100000)}`,
          type: studyKind === 'assignment' ? 'study-assignment' : 'study-exam',
          moduleName: String(form.moduleName).trim(),
          yearKey,
          yearLabel: YEARS.find((year) => year.value === yearKey)?.label || yearKey,
          timeSlot: String(form.timeSlot).trim(),
          examLabel: String(form.note || '').trim(),
          plannedDate: String(form.plannedDate).trim(),
          targetDate: String(form.plannedDate).trim(),
          targetLabel: 'Study Date',
          isCustom: true,
        };

        if (type === 'custom-study-edit') {
          setCustomStudyPlans((prev) => prev.map((entry) => (entry.id === item.id ? nextItem : entry)));
          setSuccess('Custom study date updated successfully.');
        } else {
          setCustomStudyPlans((prev) => [...prev, nextItem]);
          setSuccess('Custom study date added to your daily planner.');
        }
      }

      closePlannerModal();
    } catch (err) {
      setError(err?.message || err.response?.data?.message || 'Failed to save planner changes.');
      setPlannerModalSaving(false);
    }
  }

  async function confirmPlannerDelete() {
    if (!plannerConfirm) return;

    setError('');
    setSuccess('');
    try {
      if (plannerConfirm.action === 'delete-lecture') {
        const lectureId = plannerConfirm.payload?.lectureId;
        await api.delete(`/lecture-schedules/${lectureId}`);
        setLectureEntries((prev) => prev.filter((entry) => entry._id !== lectureId));
        setSuccess('Lecture schedule deleted successfully.');
      }

      if (plannerConfirm.action === 'delete-study-exam') {
        const item = plannerConfirm.payload?.item;
        await api.delete(`/exam-date-entries/${item.sourceId}`);
        if (item.examType === 'mid') {
          setMidEntries((prev) => prev.filter((entry) => entry._id !== item.sourceId));
        } else {
          setFinalEntries((prev) => prev.filter((entry) => entry._id !== item.sourceId));
        }
        setSuccess('Exam date entry deleted successfully.');
      }

      if (plannerConfirm.action === 'delete-study-assignment') {
        const item = plannerConfirm.payload?.item;
        await api.delete(`/assignment-schedules/${item.sourceId}`);
        setAssignmentEntries((prev) => prev.filter((entry) => entry._id !== item.sourceId));
        setSuccess('Assignment schedule deleted successfully.');
      }

      if (plannerConfirm.action === 'delete-custom-study') {
        const item = plannerConfirm.payload?.item;
        setCustomStudyPlans((prev) => prev.filter((entry) => entry.id !== item.id));
        setSuccess('Custom study date deleted successfully.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete item.');
    } finally {
      setPlannerConfirm(null);
    }
  }

  return (
    <div className="modules-page-card">
      <div className="modules-page-header">
        <h2>Timetable</h2>
        <p>Shows your followed modules with lecture, mid, final, and assignment dates.</p>
      </div>

      <form className="exam-form-box" onSubmit={handleAddLecture}>
        <h3 style={{ marginBottom: '0.6rem' }}>{editingLectureId ? 'Edit Lecture Schedule' : 'Add Lecture Schedule'}</h3>
        <div className="form-group">
          <label htmlFor="yearKey">Year</label>
          <select id="yearKey" name="yearKey" value={lectureForm.yearKey} onChange={handleLectureChange}>
            {YEARS.map((y) => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="moduleName">Module Name</label>
          <select
            id="moduleName"
            name="moduleName"
            value={lectureForm.moduleName}
            onChange={handleLectureChange}
            disabled={lectureModules.length === 0}
            required
          >
            <option value="">{lectureModules.length === 0 ? 'No selected modules for this year' : 'Select a module'}</option>
            {lectureModules.map((moduleName) => (
              <option key={moduleName} value={moduleName}>{moduleName}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="lectureDay">Lecture Day</label>
          <select
            id="lectureDay"
            name="lectureDay"
            value={lectureForm.lectureDay}
            onChange={handleLectureChange}
            required
          >
            <option value="">Select a day</option>
            {LECTURE_DAYS.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="lectureStartTime">Lecture Start Time</label>
          <input
            id="lectureStartTime"
            name="lectureStartTime"
            type="time"
            value={lectureForm.lectureStartTime}
            onChange={handleLectureChange}
            step={300}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lectureEndTime">Lecture End Time</label>
          <input
            id="lectureEndTime"
            name="lectureEndTime"
            type="time"
            value={lectureForm.lectureEndTime}
            onChange={handleLectureChange}
            step={300}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            name="location"
            type="text"
            value={lectureForm.location}
            onChange={handleLectureChange}
            placeholder="e.g. Lab 3 / Online"
            required
          />
        </div>

        <div className="modules-actions" style={{ marginTop: '0.2rem' }}>
          {editingLectureId
            ? <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Cancel</button>
            : <span />}
          <button type="submit" className="btn btn-primary" disabled={savingLecture}>
            {savingLecture ? 'Saving…' : editingLectureId ? 'Update Lecture Schedule' : 'Add Lecture Schedule'}
          </button>
        </div>
      </form>

      {loading && <p className="state-msg">Loading timetable...</p>}
      {error && <p className="error-msg">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      {!loading && !error && timetableRows.length === 0 && (
        <p className="home-modules-empty">No followed modules found. Add modules from your profile first.</p>
      )}

      {!loading && !error && timetableRows.length > 0 && !isLicUser && (
        <div className="module-latest-box daily-planner-box">
          <div className="daily-planner-header">
            <h3>Daily Planner</h3>
            <p>Your weekly lecture plan with priority focus sessions for exams and assignments due in the next few days.</p>
            <div className="daily-planner-header-actions">
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={handleAddCustomStudyDate}
              >
                Add Study Date
              </button>
            </div>
            <div className="daily-planner-view-toggle">
              <button
                type="button"
                className={`btn-ghost-sm${plannerView === 'list' ? ' daily-planner-view-active' : ''}`}
                onClick={() => setPlannerView('list')}
              >
                Planner View
              </button>
              <button
                type="button"
                className={`btn-ghost-sm${plannerView === 'calendar' ? ' daily-planner-view-active' : ''}`}
                onClick={() => {
                  setPlannerView('calendar');
                  setCalendarWeekOffset(0);
                }}
              >
                Calendar View
              </button>
            </div>
          </div>

          {plannerView === 'list' ? (
            <div className="daily-planner-grid">
              {dailyPlanner.map((day) => (
                <section
                  key={day.day}
                  className={`daily-planner-day${day.isToday ? ' daily-planner-day-today' : ''}`}
                >
                  <div className="daily-planner-day-head">
                    <h4>{day.day}</h4>
                    {day.isToday && <span className="daily-planner-badge">Today</span>}
                  </div>

                  {day.entries.length === 0 ? (
                    <p className="daily-planner-empty">No sessions scheduled.</p>
                  ) : (
                    <div className="daily-planner-list">
                      {day.entries.map((item) => (
                        <article key={item.id} className={`daily-planner-item daily-planner-item-${item.type}`}>
                          <div className="daily-planner-time">{formatPlannerTimeLabel(item.timeSlot)}</div>
                          <div className="daily-planner-content">
                            <div className="daily-planner-module">{item.moduleName}</div>
                            <div className="daily-planner-meta">
                              {item.yearLabel}
                              {item.examLabel ? ` • ${item.examLabel}` : ''}
                            </div>
                            <div className="daily-planner-location">
                              {item.targetDate ? `${item.targetLabel}: ${formatDate(item.targetDate)}` : item.location}
                            </div>
                            {item.type === 'lecture' && (
                              <div className="daily-planner-actions">
                                <button
                                  type="button"
                                  className="btn-link"
                                  onClick={() => handleEditLecture({ _id: item.id, yearKey: item.yearKey, moduleName: item.moduleName, lectureDay: item.lectureDay, lectureStartTime: item.lectureStartTime, lectureEndTime: item.lectureEndTime, location: item.location, timeSlot: item.timeSlot })}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-link timetable-delete-link"
                                  onClick={() => handleDeleteLecture(item.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                            {item.isCustom && (
                              <div className="daily-planner-actions">
                                <button
                                  type="button"
                                  className="btn-link"
                                  onClick={() => handleEditCustomStudyDate(item)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-link timetable-delete-link"
                                  onClick={() => handleDeleteCustomStudyDate(item)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                            {item.type === 'study-exam' && !item.isCustom && (
                              <div className="daily-planner-actions">
                                <button
                                  type="button"
                                  className="btn-link"
                                  onClick={() => handleEditStudyExam(item)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-link timetable-delete-link"
                                  onClick={() => handleDeleteStudyExam(item)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                            {item.type === 'study-assignment' && !item.isCustom && (
                              <div className="daily-planner-actions">
                                <button
                                  type="button"
                                  className="btn-link"
                                  onClick={() => handleEditStudyAssignment(item)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-link timetable-delete-link"
                                  onClick={() => handleDeleteStudyAssignment(item)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="daily-planner-calendar-wrap">
              <div className="daily-planner-calendar-toolbar">
                <button
                  type="button"
                  className="btn-ghost-sm"
                  onClick={() => setCalendarWeekOffset((prev) => prev - 1)}
                >
                  Previous Week
                </button>
                <span className="daily-planner-calendar-range">{plannerCalendarDays.weekLabel}</span>
                <button
                  type="button"
                  className="btn-ghost-sm"
                  onClick={() => setCalendarWeekOffset((prev) => prev + 1)}
                >
                  Next Week
                </button>
              </div>
              <div className="daily-planner-calendar-grid">
                {plannerCalendarDays.days.map((day) => (
                  <section
                    key={day.key}
                    className={`daily-planner-calendar-day${day.isToday ? ' daily-planner-calendar-day-today' : ''}`}
                  >
                    <div className="daily-planner-calendar-head">
                      <h4>{day.dayName}</h4>
                      <span>{day.dateLabel}</span>
                    </div>

                    {day.entries.length === 0 ? (
                      <p className="daily-planner-empty">No sessions scheduled.</p>
                    ) : (
                      <div className="daily-planner-calendar-list">
                        {day.entries.map((item) => (
                          <article key={`${day.key}-${item.id}`} className={`daily-planner-calendar-item daily-planner-item-${item.type}`}>
                            <div className="daily-planner-time">{formatPlannerTimeLabel(item.timeSlot)}</div>
                            <div className="daily-planner-calendar-content">
                              <div className="daily-planner-module">{item.moduleName}</div>
                              <div className="daily-planner-meta">
                                {item.yearLabel}
                                {item.examLabel ? ` • ${item.examLabel}` : ''}
                              </div>
                              <div className="daily-planner-location">
                                {item.targetDate ? `${item.targetLabel}: ${formatDate(item.targetDate)}` : item.location}
                              </div>
                              {item.type === 'lecture' && (
                                <div className="daily-planner-actions">
                                  <button
                                    type="button"
                                    className="btn-link"
                                    onClick={() => handleEditLecture({ _id: item.lectureId, yearKey: item.yearKey, moduleName: item.moduleName, lectureDay: item.lectureDay, lectureStartTime: item.lectureStartTime, lectureEndTime: item.lectureEndTime, location: item.location, timeSlot: item.timeSlot })}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-link timetable-delete-link"
                                    onClick={() => handleDeleteLecture(item.lectureId)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                              {item.isCustom && (
                                <div className="daily-planner-actions">
                                  <button
                                    type="button"
                                    className="btn-link"
                                    onClick={() => handleEditCustomStudyDate(item)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-link timetable-delete-link"
                                    onClick={() => handleDeleteCustomStudyDate(item)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                              {item.type === 'study-exam' && !item.isCustom && (
                                <div className="daily-planner-actions">
                                  <button
                                    type="button"
                                    className="btn-link"
                                    onClick={() => handleEditStudyExam(item)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-link timetable-delete-link"
                                    onClick={() => handleDeleteStudyExam(item)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                              {item.type === 'study-assignment' && !item.isCustom && (
                                <div className="daily-planner-actions">
                                  <button
                                    type="button"
                                    className="btn-link"
                                    onClick={() => handleEditStudyAssignment(item)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-link timetable-delete-link"
                                    onClick={() => handleDeleteStudyAssignment(item)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {plannerConfirm && (
        <div className="planner-modal-overlay" role="dialog" aria-modal="true">
          <div className="planner-modal-card planner-confirm-card">
            <h4>Confirm Action</h4>
            <p>{plannerConfirm.message}</p>
            <div className="planner-modal-actions">
              <button type="button" className="btn-ghost-sm" onClick={() => setPlannerConfirm(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmPlannerDelete}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {plannerModal && (
        <div className="planner-modal-overlay" role="dialog" aria-modal="true">
          <form className="planner-modal-card" onSubmit={submitPlannerModal}>
            <h4>
              {plannerModal.type === 'study-exam' && 'Edit Exam Study'}
              {plannerModal.type === 'study-assignment' && 'Edit Assignment Study'}
              {plannerModal.type === 'custom-study-add' && 'Add Study Date'}
              {plannerModal.type === 'custom-study-edit' && 'Edit Study Date'}
            </h4>

            {(plannerModal.type === 'custom-study-add' || plannerModal.type === 'custom-study-edit') && (
              <>
                <div className="form-group">
                  <label htmlFor="planner-study-kind">Study Type</label>
                  <select
                    id="planner-study-kind"
                    value={plannerModal.form.studyKind}
                    onChange={(e) => updatePlannerModalField('studyKind', e.target.value)}
                  >
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="planner-module-name">Module Name</label>
                  <input
                    id="planner-module-name"
                    type="text"
                    value={plannerModal.form.moduleName}
                    onChange={(e) => updatePlannerModalField('moduleName', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="planner-year-key">Year</label>
                  <select
                    id="planner-year-key"
                    value={plannerModal.form.yearKey}
                    onChange={(e) => updatePlannerModalField('yearKey', e.target.value)}
                  >
                    {YEARS.map((year) => (
                      <option key={year.value} value={year.value}>{year.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="planner-planned-date">Study Date</label>
                  <input
                    id="planner-planned-date"
                    type="date"
                    value={plannerModal.form.plannedDate}
                    onChange={(e) => updatePlannerModalField('plannedDate', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="planner-time-slot">Time</label>
                  <input
                    id="planner-time-slot"
                    type="text"
                    value={plannerModal.form.timeSlot}
                    onChange={(e) => updatePlannerModalField('timeSlot', e.target.value)}
                    placeholder="HH:MM or HH:MM - HH:MM"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="planner-note">Study Note</label>
                  <input
                    id="planner-note"
                    type="text"
                    value={plannerModal.form.note}
                    onChange={(e) => updatePlannerModalField('note', e.target.value)}
                  />
                </div>
              </>
            )}

            {plannerModal.type === 'study-exam' && (
              <>
                <div className="form-group">
                  <label htmlFor="planner-exam-date">Exam Date</label>
                  <input
                    id="planner-exam-date"
                    type="date"
                    value={plannerModal.form.examDate}
                    onChange={(e) => updatePlannerModalField('examDate', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="planner-exam-start">Start Time</label>
                  <input
                    id="planner-exam-start"
                    type="time"
                    value={plannerModal.form.examStartTime}
                    onChange={(e) => updatePlannerModalField('examStartTime', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="planner-exam-end">End Time</label>
                  <input
                    id="planner-exam-end"
                    type="time"
                    value={plannerModal.form.examEndTime}
                    onChange={(e) => updatePlannerModalField('examEndTime', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="planner-exam-pref">Study Preference</label>
                  <select
                    id="planner-exam-pref"
                    value={plannerModal.form.studyPreference}
                    onChange={(e) => updatePlannerModalField('studyPreference', e.target.value)}
                  >
                    <option value="neutral">Not Hard or Easy</option>
                    <option value="easy">Easy</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </>
            )}

            {plannerModal.type === 'study-assignment' && (
              <>
                <div className="form-group">
                  <label htmlFor="planner-assignment-name">Assignment Name</label>
                  <input
                    id="planner-assignment-name"
                    type="text"
                    value={plannerModal.form.assignmentName}
                    onChange={(e) => updatePlannerModalField('assignmentName', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="planner-assignment-date">Due Date</label>
                  <input
                    id="planner-assignment-date"
                    type="date"
                    value={plannerModal.form.dueDate}
                    onChange={(e) => updatePlannerModalField('dueDate', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="planner-assignment-time">Time</label>
                  <input
                    id="planner-assignment-time"
                    type="time"
                    value={plannerModal.form.timeSlot}
                    onChange={(e) => updatePlannerModalField('timeSlot', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="planner-assignment-pref">Study Preference</label>
                  <select
                    id="planner-assignment-pref"
                    value={plannerModal.form.studyPreference}
                    onChange={(e) => updatePlannerModalField('studyPreference', e.target.value)}
                  >
                    <option value="neutral">Not Hard or Easy</option>
                    <option value="easy">Easy</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </>
            )}

            <div className="planner-modal-actions">
              <button type="button" className="btn-ghost-sm" onClick={closePlannerModal} disabled={plannerModalSaving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={plannerModalSaving}>
                {plannerModalSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && !error && timetableRows.length > 0 && (
        <div className="roster-table-wrap">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Module</th>
                <th>Lecture Schedules</th>
                <th>Mid Exams</th>
                <th>Final Exams</th>
                <th>Assignments</th>
              </tr>
            </thead>
            <tbody>
              {timetableRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.yearLabel}</td>
                  <td>{row.moduleName}</td>
                  <td>
                    {row.lectures.length === 0
                      ? '-'
                      : row.lectures.map((item) => (
                        <div key={item._id} className="timetable-entry">
                          <div className="timetable-entry-text">
                            <span className="timetable-entry-day">{item.lectureDay}</span>
                            <span>{item.timeSlot}</span>
                            <span>{item.location}</span>
                          </div>
                          <div className="timetable-entry-actions">
                            <button
                              type="button"
                              className="btn-link"
                              onClick={() => handleEditLecture({ ...item, yearKey: row.yearKey, moduleName: row.moduleName })}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-link timetable-delete-link"
                              onClick={() => handleDeleteLecture(item._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                  </td>
                  <td>
                    {row.midDates.length === 0
                      ? '-'
                      : row.midDates
                        .map((item) => `${formatDate(item.examDate)}${item.examTimeSlot ? ` (${item.examTimeSlot})` : ''}`)
                        .join(', ')}
                  </td>
                  <td>
                    {row.finalDates.length === 0
                      ? '-'
                      : row.finalDates
                        .map((item) => `${formatDate(item.examDate)}${item.examTimeSlot ? ` (${item.examTimeSlot})` : ''}`)
                        .join(', ')}
                  </td>
                  <td>
                    {row.assignments.length === 0
                      ? '-'
                      : row.assignments.map((item) => (
                        <div key={`${item.assignmentName}-${item.dueDate}`} className="timetable-assignment-item">
                          <span className="timetable-assignment-name">{item.assignmentName}</span>
                          <span className="timetable-assignment-date">
                            {formatDate(item.dueDate)}{item.timeSlot ? ` (${item.timeSlot})` : ''}
                          </span>
                        </div>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
