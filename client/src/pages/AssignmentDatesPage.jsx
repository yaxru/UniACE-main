import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const YEARS = [
  { value: 'year1', label: 'Year 1' },
  { value: 'year2', label: 'Year 2' },
  { value: 'year3', label: 'Year 3' },
  { value: 'year4', label: 'Year 4' },
];

const STUDY_PREFERENCES = [
  { value: 'neutral', label: 'Not Hard or Easy' },
  { value: 'easy', label: 'Easy' },
  { value: 'hard', label: 'Hard' },
];

const ASSIGNMENT_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'coding-project', label: 'Coding / Project' },
  { value: 'document', label: 'Document / Report' },
];

const MONTH_NAME_PATTERN =
  'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const DEADLINE_POSITIVE_HINTS = [
  /submission\s+deadline/i,
  /deadline/i,
  /due\s+date/i,
  /submit(?:ted|s|ting)?\b/i,
  /courseweb/i,
  /lms/i,
];
const DEADLINE_NEGATIVE_HINTS = [
  /release\s+date/i,
  /viva/i,
  /demonstration/i,
  /start(?:ing)?\b/i,
  /presentation/i,
];
const CODING_PROJECT_HINTS = [
  /spring\s*boot/i,
  /react/i,
  /rest\s*api/i,
  /web\s*application/i,
  /github\s*actions/i,
  /github\s*repository/i,
  /implementation/i,
  /develop(?:ment)?/i,
  /project/i,
  /coding/i,
  /application/i,
  /stack/i,
  /api/i,
];
const DOCUMENT_HINTS = [
  /report/i,
  /documentation/i,
  /document\b/i,
  /essay/i,
  /proposal/i,
  /write[- ]?up/i,
  /case\s*study/i,
  /research\s*paper/i,
];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
}

function getCountdownMeta(dateStr, nowTs = Date.now()) {
  const target = parseLocalDate(dateStr);
  if (!target) return { label: '-', tone: 'unknown' };

  const now = new Date(nowTs);
  const msPerDay = 24 * 60 * 60 * 1000;
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.floor((targetUtc - todayUtc) / msPerDay);

  if (diffDays < 0) return { label: 'Passed', tone: 'past' };
  if (diffDays === 0) return { label: 'Today (0 days left)', tone: 'near' };
  if (diffDays <= 7) {
    return { label: diffDays === 1 ? '1 day left' : `${diffDays} days left`, tone: 'near' };
  }
  if (diffDays > 14) {
    return { label: `${diffDays} days left`, tone: 'far' };
  }
  return { label: `${diffDays} days left`, tone: 'medium' };
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDocumentText(rawText) {
  return String(rawText || '')
    .replace(/[\u2022\u25AA\u25CF]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function formatDocumentTextForEditor(rawText) {
  return String(rawText || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseNamedMonthDate(snippet) {
  const dayMonthRegex = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAME_PATTERN})\\s*,?\\s*(\\d{4})`, 'i');
  const monthDayRegex = new RegExp(`(${MONTH_NAME_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(\\d{4})`, 'i');
  const match = snippet.match(dayMonthRegex);
  if (match) {
    const day = Number(match[1]);
    const monthText = match[2];
    const year = Number(match[3]);
    const parsed = new Date(`${day} ${monthText} ${year}`);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
    }
  }

  const monthDayMatch = snippet.match(monthDayRegex);
  if (!monthDayMatch) return null;

  const monthFirstText = monthDayMatch[1];
  const monthFirstDay = Number(monthDayMatch[2]);
  const monthFirstYear = Number(monthDayMatch[3]);
  const monthFirstParsed = new Date(`${monthFirstText} ${monthFirstDay} ${monthFirstYear}`);
  if (Number.isNaN(monthFirstParsed.getTime())) return null;

  return new Date(
    monthFirstParsed.getFullYear(),
    monthFirstParsed.getMonth(),
    monthFirstParsed.getDate(),
    0,
    0,
    0,
    0
  );
}

function parseNumericDate(snippet) {
  const isoMatch = snippet.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const slashMatch = snippet.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
  if (!slashMatch) return null;

  const first = Number(slashMatch[1]);
  const second = Number(slashMatch[2]);
  const year = Number(slashMatch[3]);

  const dayFirst = new Date(year, second - 1, first, 0, 0, 0, 0);
  if (!Number.isNaN(dayFirst.getTime())) return dayFirst;

  const monthFirst = new Date(year, first - 1, second, 0, 0, 0, 0);
  if (!Number.isNaN(monthFirst.getTime())) return monthFirst;
  return null;
}

function parseTimeSlot(snippet) {
  const amPmMatch = snippet.match(/\b(\d{1,2})[.: ](\d{2})\s*(AM|PM)\b/i);
  if (amPmMatch) {
    let hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2]);
    const meridiem = String(amPmMatch[3]).toUpperCase();

    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const twentyFourHourMatch = snippet.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!twentyFourHourMatch) return '';

  return `${String(Number(twentyFourHourMatch[1])).padStart(2, '0')}:${twentyFourHourMatch[2]}`;
}

function scoreDeadlineSnippet(snippet) {
  let score = 0;
  DEADLINE_POSITIVE_HINTS.forEach((hint) => {
    if (hint.test(snippet)) score += 3;
  });
  DEADLINE_NEGATIVE_HINTS.forEach((hint) => {
    if (hint.test(snippet)) score -= 2;
  });
  if (/submission.{0,40}deadline|deadline.{0,40}submission/i.test(snippet)) score += 4;
  if (/\b(?:11\.45\s*pm|23:45|11:45\s*pm)\b/i.test(snippet)) score += 1;
  return score;
}

function detectAssignmentType(rawText, assignmentName = '') {
  const normalized = `${normalizeDocumentText(rawText)} ${String(assignmentName || '').trim()}`.trim();
  if (!normalized) return 'general';

  const codingHits = CODING_PROJECT_HINTS.reduce((count, hint) => count + (hint.test(normalized) ? 1 : 0), 0);
  const documentHits = DOCUMENT_HINTS.reduce((count, hint) => count + (hint.test(normalized) ? 1 : 0), 0);

  if (codingHits > documentHits && codingHits > 0) return 'coding-project';
  if (documentHits > codingHits && documentHits > 0) return 'document';
  return 'general';
}

function getAssignmentFocusDays(assignmentType, studyPreference) {
  if (assignmentType === 'coding-project') return 14;
  if (assignmentType === 'document') return 7;
  if (studyPreference === 'hard') return 10;
  if (studyPreference === 'easy') return 5;
  return 7;
}

function detectAssignmentDeadline(rawText) {
  const normalized = normalizeDocumentText(rawText);
  if (!normalized) return null;

  const searchable = normalized.replace(/\n+/g, ' ');
  const dateRegexes = [
    new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_NAME_PATTERN})\\s*,?\\s*\\d{4}\\b`, 'gi'),
    new RegExp(`\\b(?:${MONTH_NAME_PATTERN})\\s+\\d{1,2}(?:st|nd|rd|th)?\\s*,?\\s*\\d{4}\\b`, 'gi'),
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}\b/g,
  ];

  const candidates = [];

  dateRegexes.forEach((regex) => {
    let match;
    while ((match = regex.exec(searchable)) !== null) {
      const matchedText = match[0];
      const date = parseNamedMonthDate(matchedText) || parseNumericDate(matchedText);
      if (!date) continue;

      const start = Math.max(0, match.index - 140);
      const end = Math.min(searchable.length, match.index + matchedText.length + 140);
      const snippet = searchable.slice(start, end).trim();

      candidates.push({
        snippet,
        date,
        timeSlot: parseTimeSlot(snippet),
        score: scoreDeadlineSnippet(snippet),
      });
    }
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.date.getTime() - a.date.getTime();
  });

  const best = candidates[0];
  const assignmentType = detectAssignmentType(rawText);
  return {
    dueDate: toInputDate(best.date),
    timeSlot: best.timeSlot,
    evidence: best.snippet,
    assignmentType,
    focusDays: getAssignmentFocusDays(assignmentType, 'neutral'),
  };
}

async function extractTextFromPdf(file) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  const data = await file.arrayBuffer();
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;

  function buildPageText(textContent) {
    const items = textContent.items
      .map((item) => {
        const text = typeof item?.str === 'string' ? item.str : '';
        if (!text.trim()) return null;

        const x = Number(item?.transform?.[4] || 0);
        const y = Number(item?.transform?.[5] || 0);
        const width = Number(item?.width || 0);
        const height = Number(item?.height || 0);

        return {
          text,
          x,
          y,
          width,
          height,
          hasEOL: Boolean(item?.hasEOL),
        };
      })
      .filter(Boolean);

    const lines = [];

    items.forEach((item) => {
      const tolerance = Math.max(2, item.height * 0.35 || 2);
      const existingLine = lines.find((line) => Math.abs(line.y - item.y) <= tolerance);

      if (existingLine) {
        existingLine.items.push(item);
        existingLine.y = Math.max(existingLine.y, item.y);
        existingLine.forceBreak = existingLine.forceBreak || item.hasEOL;
        return;
      }

      lines.push({
        y: item.y,
        items: [item],
        forceBreak: item.hasEOL,
      });
    });

    return lines
      .sort((left, right) => right.y - left.y)
      .map((line) => {
        const orderedItems = line.items.sort((left, right) => left.x - right.x);
        let result = '';
        let previousRight = null;

        orderedItems.forEach((item, index) => {
          const estimatedWidth = item.width || Math.max(item.text.length * 4, 6);
          const gap = previousRight === null ? 0 : item.x - previousRight;
          const gapThreshold = Math.max(4, item.height * 0.3 || 4);

          if (index > 0 && gap > gapThreshold && !result.endsWith(' ')) {
            result += ' ';
          }

          result += item.text;
          previousRight = item.x + estimatedWidth;
        });

        return result.trim();
      })
      .filter(Boolean)
      .join('\n');
  }

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = buildPageText(textContent);
    pages.push(pageText);
  }

  return formatDocumentTextForEditor(pages.join('\n\n'));
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

function getModuleKey(yearKey, moduleName) {
  return `${yearKey}::${String(moduleName || '').trim().toLowerCase()}`;
}

export default function AssignmentDatesPage() {
  const { user, updateUser } = useAuth();
  const isLicUser = String(user?.itNumber || '').trim().toUpperCase().startsWith('LIC');
  const emptyForm = {
    yearKey: 'year1',
    moduleName: '',
    assignmentName: '',
    assignmentType: 'general',
    dueDate: '',
    timeSlot: '',
    studyPreference: 'neutral',
  };

  const [form, setForm] = useState({ ...emptyForm });
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSavedSchedule, setLastSavedSchedule] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [updatingProgressId, setUpdatingProgressId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [assignmentBrief, setAssignmentBrief] = useState('');
  const [suggestedDeadline, setSuggestedDeadline] = useState(null);
  const [detectMessage, setDetectMessage] = useState('');
  const minDate = toInputDate(new Date());
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesByYear, setModulesByYear] = useState(user?.modulesByYear || {});

  const licPublicModules = Array.from(new Set([
    ...(modulesByYear?.year1 || []),
    ...(modulesByYear?.year2 || []),
    ...(modulesByYear?.year3 || []),
    ...(modulesByYear?.year4 || []),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const availableModules = isLicUser
    ? licPublicModules
    : Array.isArray(modulesByYear?.[form.yearKey])
      ? modulesByYear[form.yearKey].filter(Boolean)
      : [];

  const followedModuleKeys = new Set(
    YEARS.flatMap((year) => {
      const modules = Array.isArray(modulesByYear?.[year.value]) ? modulesByYear[year.value] : [];
      return modules
        .filter(Boolean)
        .map((moduleName) => getModuleKey(year.value, moduleName));
    })
  );

  const dashboardSchedules = isLicUser
    ? schedules
    : schedules.filter((item) => followedModuleKeys.has(getModuleKey(item.yearKey, item.moduleName)));

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    fetchModulesForForm();
  }, [user?.id, isLicUser]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  async function fetchSchedules() {
    setLoading(true);
    try {
      const { data } = await api.get('/assignment-schedules');
      setSchedules(data);
    } catch {
      setError('Failed to load assignment schedules.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfileModules() {
    setModulesLoading(true);
    try {
      const { data } = await api.get('/profile');
      const nextModulesByYear = data.modulesByYear || {};
      setModulesByYear(nextModulesByYear);
      updateUser({
        ...(user || {}),
        name: data.name,
        phone: data.phone,
        itNumber: data.itNumber,
        role: data.role,
        modulesByYear: nextModulesByYear,
      });
    } catch {
      setModulesByYear({});
    } finally {
      setModulesLoading(false);
    }
  }

  async function fetchPublicModules() {
    setModulesLoading(true);
    try {
      const { data } = await api.get('/profile/modules/public');
      setModulesByYear(data || {});
    } catch {
      setModulesByYear({});
    } finally {
      setModulesLoading(false);
    }
  }

  function fetchModulesForForm() {
    if (isLicUser) {
      fetchPublicModules();
      return;
    }

    if (user?.modulesByYear) {
      setModulesByYear(user.modulesByYear);
      return;
    }

    fetchProfileModules();
  }

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === 'yearKey') {
      const nextModules = isLicUser
        ? licPublicModules
        : Array.isArray(modulesByYear?.[value]) ? modulesByYear[value].filter(Boolean) : [];
      setForm((prev) => ({
        ...prev,
        yearKey: value,
        moduleName: nextModules.includes(prev.moduleName) ? prev.moduleName : '',
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function normalizeForInput(dateStr) {
    const parsed = parseLocalDate(dateStr);
    return parsed ? toInputDate(parsed) : '';
  }

  function handleEdit(item) {
    setEditingScheduleId(item._id);
    setForm({
      yearKey: item.yearKey,
      moduleName: item.moduleName,
      assignmentName: item.assignmentName,
      assignmentType: item.assignmentType || 'general',
      dueDate: normalizeForInput(item.dueDate),
      timeSlot: normalizeTimeForInput(item.timeSlot),
      studyPreference: item.studyPreference || 'neutral',
    });
    setError('');
    setSuccess('');
  }

  function handleCancelEdit() {
    setEditingScheduleId(null);
    setForm({ ...emptyForm });
    setError('');
    setSuccess('');
  }

  function isOwnedByUser(item) {
    return String(item?.createdBy?._id || item?.createdBy?.id || item?.createdBy || '') === String(user?.id || '');
  }

  function runDeadlineDetection(sourceText) {
    const suggestion = detectAssignmentDeadline(sourceText);
    setSuggestedDeadline(suggestion);

    if (!suggestion) {
      setDetectMessage('No deadline could be detected. Include a line with words like "submission deadline" and a date.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      assignmentType: suggestion.assignmentType || prev.assignmentType,
    }));

    setDetectMessage('Deadline detected. Review it and apply if correct.');
  }

  function handleDetectDeadline() {
    setDetectMessage('');
    runDeadlineDetection(assignmentBrief);
  }

  function handleApplySuggestedDeadline() {
    if (!suggestedDeadline) return;

    setForm((prev) => ({
      ...prev,
      dueDate: suggestedDeadline.dueDate,
      assignmentType: suggestedDeadline.assignmentType || prev.assignmentType,
      timeSlot: suggestedDeadline.timeSlot || prev.timeSlot,
    }));

    setSuccess('Suggested deadline applied to the form.');
    setError('');
  }

  async function handleAssignmentBriefUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const filename = String(file.name || '').toLowerCase();
    const isLikelyText = file.type.startsWith('text/') || filename.endsWith('.txt') || filename.endsWith('.md');
    const isPdf = file.type === 'application/pdf' || filename.endsWith('.pdf');

    if (!isLikelyText && !isPdf) {
      setDetectMessage('Supported formats are .txt, .md, and .pdf. You can also paste text manually.');
      e.target.value = '';
      return;
    }

    e.target.value = '';

    try {
      setDetectMessage('Document loaded. Detecting deadline...');
      const fileText = isPdf
        ? await extractTextFromPdf(file)
        : formatDocumentTextForEditor(await file.text());

      if (!fileText) {
        setDetectMessage('No readable text found in this document. Try another file or paste text manually.');
        return;
      }

      setAssignmentBrief(fileText);
      runDeadlineDetection(fileText);
    } catch {
      setDetectMessage('Failed to read the document. Try pasting the text manually.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (form.dueDate < minDate) {
      setError('Past assignment dates are not allowed.');
      setSaving(false);
      return;
    }

    try {
      const { data } = editingScheduleId
        ? await api.put(`/assignment-schedules/${editingScheduleId}`, form)
        : await api.post('/assignment-schedules', form);

      setSchedules((prev) => {
        const next = editingScheduleId
          ? prev.map((item) => (item._id === editingScheduleId ? data : item))
          : [...prev, data];

        return next.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      });
      setLastSavedSchedule(data);
      setSuccess(editingScheduleId ? 'Assignment dates updated successfully.' : 'Assignment dates added successfully.');
      setForm({ ...emptyForm });
      setEditingScheduleId(null);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editingScheduleId ? 'update' : 'add'} assignment dates.`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(scheduleId) {
    if (!window.confirm('Delete this assignment schedule?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.delete(`/assignment-schedules/${scheduleId}`);
      setSchedules((prev) => prev.filter((item) => item._id !== scheduleId));
      setLastSavedSchedule((prev) => (prev?._id === scheduleId ? null : prev));
      if (editingScheduleId === scheduleId) {
        handleCancelEdit();
      }
      setSuccess('Assignment schedule deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete assignment schedule.');
    }
  }

  async function handleProgressChange(scheduleId, progress) {
    setUpdatingProgressId(scheduleId);
    try {
      const { data } = await api.patch(`/assignment-schedules/${scheduleId}/progress`, { progress });
      setSchedules((prev) => prev.map((item) => (item._id === scheduleId ? data : item)));
      if (lastSavedSchedule?._id === scheduleId) setLastSavedSchedule(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update progress.');
    } finally {
      setUpdatingProgressId(null);
    }
  }

  return (
    <div className="modules-page-card">
      <div className="modules-page-header">
        <h2>Assignment Dates</h2>
        <p>{editingScheduleId ? 'Edit assignment due dates for a module.' : 'Add assignment due dates for modules.'}</p>
      </div>

      <form onSubmit={handleSubmit} className="exam-form-box">
        <div className="assignment-deadline-helper">
          <h4>Auto Detect Deadline</h4>
          <p>Paste assignment brief text or upload a text/PDF document to suggest the assignment deadline.</p>
          <div className="form-group">
            <label htmlFor="assignmentBrief">Assignment Brief Text</label>
            <textarea
              id="assignmentBrief"
              name="assignmentBrief"
              rows={5}
              value={assignmentBrief}
              onChange={(e) => setAssignmentBrief(e.target.value)}
              placeholder="Paste text like: Submission deadline: 11.45 PM, 27th April 2026"
            />
          </div>
          <div className="assignment-deadline-helper-actions">
            <label htmlFor="assignmentBriefFile" className="btn-ghost-sm assignment-upload-btn">
              Upload Document
            </label>
            <input
              id="assignmentBriefFile"
              type="file"
              accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
              onChange={handleAssignmentBriefUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={handleDetectDeadline}
              disabled={!assignmentBrief.trim()}
            >
              Detect Deadline
            </button>
          </div>

          {detectMessage && (
            <p className={suggestedDeadline ? 'success-msg' : 'error-msg'}>{detectMessage}</p>
          )}

          {suggestedDeadline && (
            <div className="assignment-deadline-suggestion">
              <p>
                Suggested deadline: <strong>{formatDate(suggestedDeadline.dueDate)}</strong>
                {suggestedDeadline.timeSlot ? ` at ${suggestedDeadline.timeSlot}` : ''}
              </p>
              <p>
                Suggested type: <strong>{ASSIGNMENT_TYPES.find((option) => option.value === suggestedDeadline.assignmentType)?.label || 'General'}</strong>
                {` (${suggestedDeadline.focusDays} day focus window)`}
              </p>
              <p className="assignment-deadline-evidence">Matched from: {suggestedDeadline.evidence}</p>
              <button type="button" className="btn btn-secondary" onClick={handleApplySuggestedDeadline}>
                Use Suggested Deadline
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="yearKey">Year</label>
          <select id="yearKey" name="yearKey" value={form.yearKey} onChange={handleChange}>
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
            value={form.moduleName}
            onChange={handleChange}
            disabled={modulesLoading || availableModules.length === 0}
            required
          >
            <option value="">
              {modulesLoading ? 'Loading modules...' : availableModules.length === 0 ? 'No selected modules for this year' : 'Select a module'}
            </option>
            {availableModules.map((moduleName) => (
              <option key={moduleName} value={moduleName}>{moduleName}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="assignmentName">Assignment Name</label>
          <input
            id="assignmentName"
            name="assignmentName"
            type="text"
            value={form.assignmentName}
            onChange={handleChange}
            placeholder="e.g. Assignment 1"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="assignmentType">Assignment Type</label>
          <select
            id="assignmentType"
            name="assignmentType"
            value={form.assignmentType}
            onChange={handleChange}
          >
            {ASSIGNMENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="dueDate">Due Date</label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            value={form.dueDate}
            onChange={handleChange}
            min={minDate}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="timeSlot">Assignment Time Slot</label>
          <input
            id="timeSlot"
            name="timeSlot"
            type="time"
            value={form.timeSlot}
            onChange={handleChange}
            step={300}
            required
          />
        </div>

        {!isLicUser && (
          <div className="form-group">
            <label htmlFor="studyPreference">Assignment Difficulty Preference</label>
            <select
              id="studyPreference"
              name="studyPreference"
              value={form.studyPreference}
              onChange={handleChange}
            >
              {STUDY_PREFERENCES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}
        {!modulesLoading && availableModules.length === 0 && (
          <p className="error-msg">{isLicUser ? 'No modules found for the chosen year.' : 'No selected modules are available for the chosen year.'}</p>
        )}

        {lastSavedSchedule && (
          <div className="exam-countdown-box">
            <h4>Countdown</h4>
            <p>
              {YEARS.find((y) => y.value === lastSavedSchedule.yearKey)?.label || lastSavedSchedule.yearKey} / {lastSavedSchedule.moduleName} / {lastSavedSchedule.assignmentName}
            </p>
            <p>
              Type: {ASSIGNMENT_TYPES.find((option) => option.value === (lastSavedSchedule.assignmentType || 'general'))?.label || 'General'}
              {` • Focus Window: ${getAssignmentFocusDays(lastSavedSchedule.assignmentType || 'general', lastSavedSchedule.studyPreference || 'neutral')} days`}
            </p>
            <p>Time Slot: {lastSavedSchedule.timeSlot || '-'}</p>
            <div className="exam-countdown-grid">
              {(() => {
                const dueCountdown = getCountdownMeta(lastSavedSchedule.dueDate, nowTick);
                return (
                  <div className={`exam-countdown-item exam-countdown-${dueCountdown.tone}`}>
                    <strong>Due:</strong> {dueCountdown.label}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <div className="modules-actions">
          {editingScheduleId ? (
            <button type="button" className="btn-ghost-sm" onClick={handleCancelEdit} disabled={saving}>
              Cancel Edit
            </button>
          ) : <span />}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editingScheduleId ? 'Update Assignment Date' : 'Add Assignment Date'}
          </button>
        </div>
      </form>

      <div className="module-latest-box">
        <h3>Assignment Dashboard</h3>
        <p className="module-upload-subtitle">
          {isLicUser
            ? 'Shows assignments including entries added by other users.'
            : 'Shows all of your assignments under the modules you currently follow.'}
        </p>

        {loading && <p className="state-msg" style={{ textAlign: 'left', padding: 0 }}>Loading schedules…</p>}

        {!loading && dashboardSchedules.length === 0 && (
          <p className="home-modules-empty">No assignments found for your currently followed modules.</p>
        )}

        {!loading && dashboardSchedules.length > 0 && (() => {
          const total = dashboardSchedules.length;
          const notStarted = dashboardSchedules.filter((s) => (s.progress || 'Not Started') === 'Not Started').length;
          const inProgress = dashboardSchedules.filter((s) => s.progress === 'In Progress').length;
          const completed = dashboardSchedules.filter((s) => s.progress === 'Completed').length;
          const overdue = dashboardSchedules.filter(
            (s) => getCountdownMeta(s.dueDate, nowTick).tone === 'past' && s.progress !== 'Completed'
          ).length;
          const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);

          const filteredSchedules =
            filterStatus === 'All'
              ? dashboardSchedules
              : dashboardSchedules.filter((s) => (s.progress || 'Not Started') === filterStatus);

          return (
            <>
              {/* Summary cards */}
              <div className="assignment-progress-summary">
                <div className="assignment-stat-cards">
                  <div className="assignment-stat-card stat-total">
                    <span className="stat-number">{total}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  {!isLicUser && (
                    <>
                      <div className="assignment-stat-card stat-not-started">
                        <span className="stat-number">{notStarted}</span>
                        <span className="stat-label">Not Started</span>
                      </div>
                      <div className="assignment-stat-card stat-in-progress">
                        <span className="stat-number">{inProgress}</span>
                        <span className="stat-label">In Progress</span>
                      </div>
                      <div className="assignment-stat-card stat-completed">
                        <span className="stat-number">{completed}</span>
                        <span className="stat-label">Completed</span>
                      </div>
                    </>
                  )}
                  {overdue > 0 && (
                    <div className="assignment-stat-card stat-overdue">
                      <span className="stat-number">{overdue}</span>
                      <span className="stat-label">Overdue</span>
                    </div>
                  )}
                </div>

                {!isLicUser && (
                  <div className="assignment-progress-bar-wrap">
                    <div className="assignment-progress-bar-labels">
                      <span>
                        Overall Completion
                        <span className="assignment-progress-bar-count">
                          {completed} of {total} completed
                        </span>
                      </span>
                      <span>{completionPct}%</span>
                    </div>
                    <div className="assignment-progress-bar-track">
                      <div
                        className="assignment-progress-bar-fill"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Filter tabs */}
              {!isLicUser && (
                <div className="assignment-filter-bar">
                  {['All', 'Not Started', 'In Progress', 'Completed'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`filter-btn${filterStatus === status ? ' filter-btn-active' : ''}`}
                      onClick={() => setFilterStatus(status)}
                    >
                      {status}
                      {status !== 'All' && (
                        <span className="filter-btn-count">
                          {status === 'Not Started' ? notStarted : status === 'In Progress' ? inProgress : completed}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {filterStatus !== 'All' && filteredSchedules.length > 0 && (
                <p className="assignment-filter-note">
                  Showing {filteredSchedules.length} of {total} assignments — overall completion is always based on all assignments.
                </p>
              )}

              {filteredSchedules.length === 0 ? (
                <p className="home-modules-empty">No assignments match this filter.</p>
              ) : (
                <div className="roster-table-wrap">
                  <table className="roster-table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Module</th>
                        <th>Assignment</th>
                        <th>Due Date</th>
                        <th>Time Slot</th>
                        <th>Countdown</th>
                        {!isLicUser && <th>Progress</th>}
                        {isLicUser && <th>Added By</th>}
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchedules.map((item) => {
                        const dueCountdown = getCountdownMeta(item.dueDate, nowTick);
                        const isOverdue = dueCountdown.tone === 'past' && item.progress !== 'Completed';
                        const canManage = isLicUser || isOwnedByUser(item);

                        return (
                          <tr key={item._id} className={isOverdue ? 'assignment-row-overdue' : ''}>
                            <td>{YEARS.find((y) => y.value === item.yearKey)?.label || item.yearKey}</td>
                            <td>{item.moduleName}</td>
                            <td>
                              {item.assignmentName}
                              {isOverdue && <span className="overdue-badge">Overdue</span>}
                            </td>
                            <td>{formatDate(item.dueDate)}</td>
                            <td>{item.timeSlot || '-'}</td>
                            <td>
                              <span className={`exam-countdown-pill exam-countdown-${dueCountdown.tone}`}>
                                {dueCountdown.label}
                              </span>
                            </td>
                            {!isLicUser && (
                              <td>
                                <select
                                  value={item.progress || 'Not Started'}
                                  disabled={updatingProgressId === item._id || !canManage}
                                  onChange={(e) => handleProgressChange(item._id, e.target.value)}
                                  className={`progress-select progress-${(item.progress || 'Not Started').toLowerCase().replace(/ /g, '-')}`}
                                >
                                  <option value="Not Started">Not Started</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </td>
                            )}
                            {isLicUser && <td>{item.createdBy?.username || 'unknown'}</td>}
                            <td>
                              {canManage ? (
                                <>
                                  <button type="button" className="btn-ghost" onClick={() => handleEdit(item)}>
                                    Edit
                                  </button>{' '}
                                  <button type="button" className="btn-ghost danger" onClick={() => handleDelete(item._id)}>
                                    Delete
                                  </button>
                                </>
                              ) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
