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

export default function FinalExamDatesPage() {
  const { user, updateUser } = useAuth();
  const isLicUser = String(user?.itNumber || '').trim().toUpperCase().startsWith('LIC');
  const emptyForm = {
    yearKey: 'year1',
    moduleName: '',
    examDate: '',
    examStartTime: '',
    examEndTime: '',
    studyPreference: 'neutral',
  };

function getDisplayTimeRange(item) {
  const start = item?.examStartTime || '';
  const end = item?.examEndTime || '';
  if (start && end) return `${start} - ${end}`;
  return item?.examTimeSlot || '-';
}

  const [form, setForm] = useState({ ...emptyForm });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSavedEntry, setLastSavedEntry] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesByYear, setModulesByYear] = useState(user?.modulesByYear || {});
  const minDate = toInputDate(new Date());

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

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    fetchModulesForForm();
  }, [user?.id, isLicUser]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  async function fetchEntries() {
    setLoading(true);
    try {
      const { data } = await api.get('/exam-date-entries', { params: { examType: 'final' } });
      setEntries(data);
    } catch {
      setError('Failed to load final exam dates.');
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
    const slotParts = String(item.examTimeSlot || '').split('-').map((part) => normalizeTimeForInput(part.trim()));
    const slotStart = slotParts[0] || '';
    const slotEnd = slotParts[1] || '';
    setEditingEntryId(item._id);
    setForm({
      yearKey: item.yearKey,
      moduleName: item.moduleName,
      examDate: normalizeForInput(item.examDate),
      examStartTime: normalizeTimeForInput(item.examStartTime) || slotStart,
      examEndTime: normalizeTimeForInput(item.examEndTime) || slotEnd,
      studyPreference: item.studyPreference || 'neutral',
    });
    setError('');
    setSuccess('');
  }

  function handleCancelEdit() {
    setEditingEntryId(null);
    setForm({ ...emptyForm });
    setError('');
    setSuccess('');
  }

  function isOwnedByUser(item) {
    return String(item?.createdBy?._id || item?.createdBy?.id || item?.createdBy || '') === String(user?.id || '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (form.examDate < minDate) {
      setError('Past exam dates are not allowed.');
      setSaving(false);
      return;
    }

    try {
      const payload = { examType: 'final', ...form };
      const { data } = editingEntryId
        ? await api.put(`/exam-date-entries/${editingEntryId}`, payload)
        : await api.post('/exam-date-entries', payload);

      setEntries((prev) => {
        const next = editingEntryId
          ? prev.map((item) => (item._id === editingEntryId ? data : item))
          : [...prev, data];

        return next.sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
      });
      setLastSavedEntry(data);
      setSuccess(editingEntryId ? 'Final exam date updated successfully.' : 'Final exam date added successfully.');
      setForm({ ...emptyForm });
      setEditingEntryId(null);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editingEntryId ? 'update' : 'add'} final exam date.`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId) {
    if (!window.confirm('Delete this final exam date?')) return;

    setError('');
    setSuccess('');

    try {
      await api.delete(`/exam-date-entries/${entryId}`);
      setEntries((prev) => prev.filter((item) => item._id !== entryId));
      setLastSavedEntry((prev) => (prev?._id === entryId ? null : prev));
      if (editingEntryId === entryId) handleCancelEdit();
      setSuccess('Final exam date deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete final exam date.');
    }
  }

  return (
    <div className="modules-page-card">
      <div className="modules-page-header">
        <h2>Final Exam Dates</h2>
        <p>{editingEntryId ? 'Edit final exam date for a module.' : 'Add final exam dates for modules.'}</p>
      </div>

      <form onSubmit={handleSubmit} className="exam-form-box">
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
          <label htmlFor="examDate">Final Exam Date</label>
          <input
            id="examDate"
            name="examDate"
            type="date"
            value={form.examDate}
            onChange={handleChange}
            min={minDate}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="examStartTime">Final Exam Start Time</label>
          <input
            id="examStartTime"
            name="examStartTime"
            type="time"
            value={form.examStartTime}
            onChange={handleChange}
            step={300}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="examEndTime">Final Exam End Time</label>
          <input
            id="examEndTime"
            name="examEndTime"
            type="time"
            value={form.examEndTime}
            onChange={handleChange}
            step={300}
            required
          />
        </div>

        {!isLicUser && (
          <div className="form-group">
            <label htmlFor="studyPreference">Exam Difficulty Preference</label>
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

        {lastSavedEntry && (
          <div className="exam-countdown-box">
            <h4>Countdown</h4>
            <p>
              {YEARS.find((y) => y.value === lastSavedEntry.yearKey)?.label || lastSavedEntry.yearKey} / {lastSavedEntry.moduleName}
            </p>
            <p>Time Slot: {getDisplayTimeRange(lastSavedEntry)}</p>
            <div className="exam-countdown-grid">
              {(() => {
                const due = getCountdownMeta(lastSavedEntry.examDate, nowTick);
                return (
                  <div className={`exam-countdown-item exam-countdown-${due.tone}`}>
                    <strong>Final:</strong> {due.label}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <div className="modules-actions">
          {editingEntryId ? (
            <button type="button" className="btn-ghost-sm" onClick={handleCancelEdit} disabled={saving}>
              Cancel Edit
            </button>
          ) : <span />}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editingEntryId ? 'Update Final Exam Date' : 'Add Final Exam Date'}
          </button>
        </div>
      </form>

      <div className="module-latest-box">
        <h3>Saved Final Exam Dates</h3>
        {isLicUser && <p className="module-upload-subtitle">You can view final exam dates added by all LIC users and students.</p>}

        {loading && <p className="state-msg" style={{ textAlign: 'left', padding: 0 }}>Loading schedules…</p>}
        {!loading && entries.length === 0 && <p className="home-modules-empty">No final exam dates added yet.</p>}

        {!loading && entries.length > 0 && (
          <div className="roster-table-wrap">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Module</th>
                  <th>Final Exam Date</th>
                  <th>Time Slot</th>
                  <th>Countdown</th>
                  <th>Added By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((item) => {
                  const c = getCountdownMeta(item.examDate, nowTick);
                  const canManage = isLicUser || isOwnedByUser(item);
                  return (
                    <tr key={item._id}>
                      <td>{YEARS.find((y) => y.value === item.yearKey)?.label || item.yearKey}</td>
                      <td>{item.moduleName}</td>
                      <td>{formatDate(item.examDate)}</td>
                      <td>{getDisplayTimeRange(item)}</td>
                      <td><span className={`exam-countdown-pill exam-countdown-${c.tone}`}>{c.label}</span></td>
                      <td>{item.createdBy?.username || 'unknown'}</td>
                      <td>
                        {canManage ? (
                          <>
                            <button type="button" className="btn-ghost" onClick={() => handleEdit(item)}>Edit</button>{' '}
                            <button type="button" className="btn-ghost danger" onClick={() => handleDelete(item._id)}>Delete</button>
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
      </div>
    </div>
  );
}
