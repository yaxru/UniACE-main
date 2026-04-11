import { useEffect, useState } from 'react';
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

function getCountdownLabel(dateStr, nowTs = Date.now()) {
  const countdown = getCountdownMeta(dateStr, nowTs);
  return countdown.label;
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

export default function ExamDatesPage() {
  const { user, updateUser } = useAuth();
  const emptyForm = {
    yearKey: 'year1',
    moduleName: '',
    midExamDate: '',
    finalExamDate: '',
  };
  const [form, setForm] = useState({
    ...emptyForm,
  });
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const minDate = toInputDate(new Date());
  const [lastSavedSchedule, setLastSavedSchedule] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesByYear, setModulesByYear] = useState(user?.modulesByYear || {});

  const availableModules = Array.isArray(modulesByYear?.[form.yearKey])
    ? modulesByYear[form.yearKey].filter(Boolean)
    : [];

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (user?.modulesByYear) {
      setModulesByYear(user.modulesByYear);
      return;
    }

    fetchProfileModules();
  }, [user?.id]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  async function fetchSchedules() {
    setLoading(true);
    try {
      const { data } = await api.get('/exam-schedules');
      setSchedules(data);
    } catch {
      setError('Failed to load exam schedules.');
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

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === 'yearKey') {
      const nextModules = Array.isArray(modulesByYear?.[value]) ? modulesByYear[value].filter(Boolean) : [];
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
      midExamDate: normalizeForInput(item.midExamDate),
      finalExamDate: normalizeForInput(item.finalExamDate),
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

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (form.midExamDate < minDate || form.finalExamDate < minDate) {
      setError('Past exam dates are not allowed.');
      setSaving(false);
      return;
    }

    if (form.finalExamDate < form.midExamDate) {
      setError('Final exam date cannot be earlier than mid exam date.');
      setSaving(false);
      return;
    }

    try {
      const { data } = editingScheduleId
        ? await api.put(`/exam-schedules/${editingScheduleId}`, form)
        : await api.post('/exam-schedules', form);

      setSchedules((prev) => {
        const next = editingScheduleId
          ? prev.map((item) => (item._id === editingScheduleId ? data : item))
          : [...prev, data];

        return next.sort((a, b) => new Date(a.midExamDate).getTime() - new Date(b.midExamDate).getTime());
      });
      setLastSavedSchedule(data);
      setSuccess(editingScheduleId ? 'Exam dates updated successfully.' : 'Exam dates added successfully.');
      setForm({ ...emptyForm });
      setEditingScheduleId(null);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editingScheduleId ? 'update' : 'add'} exam dates.`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(scheduleId) {
    if (!window.confirm('Delete this exam schedule?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.delete(`/exam-schedules/${scheduleId}`);
      setSchedules((prev) => prev.filter((item) => item._id !== scheduleId));
      setLastSavedSchedule((prev) => (prev?._id === scheduleId ? null : prev));
      if (editingScheduleId === scheduleId) {
        handleCancelEdit();
      }
      setSuccess('Exam schedule deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete exam schedule.');
    }
  }

  return (
    <div className="modules-page-card">
      <div className="modules-page-header">
        <h2>Exam Dates</h2>
        <p>{editingScheduleId ? 'Edit mid and final exam dates for a module.' : 'Add mid and final exam dates for modules.'}</p>
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
          <label htmlFor="midExamDate">Mid Exam Date</label>
          <input
            id="midExamDate"
            name="midExamDate"
            type="date"
            value={form.midExamDate}
            onChange={handleChange}
            min={minDate}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="finalExamDate">Final Exam Date</label>
          <input
            id="finalExamDate"
            name="finalExamDate"
            type="date"
            value={form.finalExamDate}
            onChange={handleChange}
            min={minDate}
            required
          />
        </div>

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}
        {!modulesLoading && availableModules.length === 0 && (
          <p className="error-msg">No selected modules are available for the chosen year.</p>
        )}

        {lastSavedSchedule && (
          <div className="exam-countdown-box">
            <h4>Countdown</h4>
            <p>
              {YEARS.find((y) => y.value === lastSavedSchedule.yearKey)?.label || lastSavedSchedule.yearKey} / {lastSavedSchedule.moduleName}
            </p>
            <div className="exam-countdown-grid">
              {(() => {
                const midCountdown = getCountdownMeta(lastSavedSchedule.midExamDate, nowTick);
                const finalCountdown = getCountdownMeta(lastSavedSchedule.finalExamDate, nowTick);

                return (
                  <>
                    <div className={`exam-countdown-item exam-countdown-${midCountdown.tone}`}>
                      <strong>Mid:</strong> {midCountdown.label}
                    </div>
                    <div className={`exam-countdown-item exam-countdown-${finalCountdown.tone}`}>
                      <strong>Final:</strong> {finalCountdown.label}
                    </div>
                  </>
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
            {saving ? 'Saving…' : editingScheduleId ? 'Update Exam Dates' : 'Add Exam Dates'}
          </button>
        </div>
      </form>

      <div className="module-latest-box">
        <h3>Saved Exam Schedules</h3>

        {loading && <p className="state-msg" style={{ textAlign: 'left', padding: 0 }}>Loading schedules…</p>}

        {!loading && schedules.length === 0 && (
          <p className="home-modules-empty">No exam schedules added yet.</p>
        )}

        {!loading && schedules.length > 0 && (
          <div className="roster-table-wrap">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Module</th>
                  <th>Mid Exam</th>
                  <th>Mid Countdown</th>
                  <th>Final Exam</th>
                  <th>Final Countdown</th>
                  <th>Added By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((item) => {
                  const midCountdown = getCountdownMeta(item.midExamDate, nowTick);
                  const finalCountdown = getCountdownMeta(item.finalExamDate, nowTick);

                  return (
                    <tr key={item._id}>
                      <td>{YEARS.find((y) => y.value === item.yearKey)?.label || item.yearKey}</td>
                      <td>{item.moduleName}</td>
                      <td>{formatDate(item.midExamDate)}</td>
                      <td>
                        <span className={`exam-countdown-pill exam-countdown-${midCountdown.tone}`}>
                          {midCountdown.label}
                        </span>
                      </td>
                      <td>{formatDate(item.finalExamDate)}</td>
                      <td>
                        <span className={`exam-countdown-pill exam-countdown-${finalCountdown.tone}`}>
                          {finalCountdown.label}
                        </span>
                      </td>
                      <td>{item.createdBy?.username || 'unknown'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </button>{' '}
                        <button
                          type="button"
                          className="btn-ghost danger"
                          onClick={() => handleDelete(item._id)}
                        >
                          Delete
                        </button>
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
