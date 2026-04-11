import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const YEAR_CONFIG = [
  { key: 'year1', label: 'Year 1' },
  { key: 'year2', label: 'Year 2' },
  { key: 'year3', label: 'Year 3' },
  { key: 'year4', label: 'Year 4' },
];

const EMPTY_MODULES = {
  year1: [''],
  year2: [''],
  year3: [''],
  year4: [''],
};

function buildEditableModules(data) {
  const next = { ...EMPTY_MODULES };

  for (const { key } of YEAR_CONFIG) {
    const values = Array.isArray(data?.[key]) ? data[key].filter((m) => typeof m === 'string') : [];
    next[key] = values.length ? values : [''];
  }

  return next;
}

function toPayload(modules) {
  const payload = {};

  for (const { key } of YEAR_CONFIG) {
    payload[key] = (modules[key] || [])
      .map((m) => m.trim())
      .filter(Boolean);
  }

  return payload;
}

function toModuleLinks(modules) {
  return YEAR_CONFIG.map((year) => ({
    ...year,
    modules: (modules[year.key] || [])
      .map((m) => m.trim())
      .filter(Boolean),
  })).filter((entry) => entry.modules.length > 0);
}

export default function ModulesPage() {
  const { user, updateUser } = useAuth();
  const [modules, setModules] = useState(EMPTY_MODULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentItNumber = user?.itNumber || '';
  const hasLicItNumber = currentItNumber.trim().toUpperCase().startsWith('LIC');
  const moduleLinks = toModuleLinks(modules);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setError('');
    try {
      const { data } = await api.get('/profile');
      updateUser({
        ...user,
        itNumber: data.itNumber,
        modulesByYear: data.modulesByYear,
      });
      setModules(buildEditableModules(data.modulesByYear));
    } catch {
      setError('Failed to load modules data.');
    } finally {
      setLoading(false);
    }
  }

  function handleModuleChange(yearKey, index, value) {
    setModules((prev) => {
      const next = { ...prev };
      next[yearKey] = [...next[yearKey]];
      next[yearKey][index] = value;
      return next;
    });
  }

  function addModuleField(yearKey) {
    setModules((prev) => {
      const next = { ...prev };
      next[yearKey] = [...next[yearKey], ''];
      return next;
    });
  }

  function removeModuleField(yearKey, index) {
    setModules((prev) => {
      const next = { ...prev };
      const updated = next[yearKey].filter((_, i) => i !== index);
      next[yearKey] = updated.length ? updated : [''];
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = toPayload(modules);
      const { data } = await api.put('/profile', { modulesByYear: payload });
      setModules(buildEditableModules(data.modulesByYear));
      updateUser({
        ...user,
        modulesByYear: data.modulesByYear,
      });
      setSuccess('Modules updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update modules.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="state-msg">Loading modules page…</p>;
  }

  if (!hasLicItNumber) {
    return (
      <div className="modules-page-card">
        <h2>Modules (Year 1 - Year 4)</h2>
        <p className="error-msg">This page is available only for IT numbers starting with LIC.</p>
        <Link to="/profile" className="btn btn-secondary">Back to Profile</Link>
      </div>
    );
  }

  return (
    <div className="modules-page-card">
      <div className="modules-page-header">
        <h2>Manage Modules</h2>
        <p>Add module names for each year from 1 to 4.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {YEAR_CONFIG.map((year) => (
          <div key={year.key} className="year-section">
            <div className="year-section-head">
              <h3>{year.label}</h3>
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={() => addModuleField(year.key)}
              >
                + Add Module
              </button>
            </div>

            {modules[year.key].map((moduleName, index) => (
              <div key={`${year.key}-${index}`} className="module-row">
                <input
                  type="text"
                  value={moduleName}
                  onChange={(e) => handleModuleChange(year.key, index, e.target.value)}
                  placeholder={`Enter ${year.label} module name`}
                />
                <button
                  type="button"
                  className="btn-ghost danger"
                  onClick={() => removeModuleField(year.key, index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ))}

        {success && <p className="success-msg">{success}</p>}
        {error && <p className="error-msg">{error}</p>}

        <div className="modules-actions">
          <Link to="/profile" className="btn-ghost-sm">Back</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Modules'}
          </button>
        </div>
      </form>

      <div className="module-upload-links">
        <h3>Module Pages</h3>
        <p>Open a module page to upload an Excel sheet with student details.</p>

        {moduleLinks.length === 0 && (
          <p className="home-modules-empty">Add and save modules first to generate module pages.</p>
        )}

        {moduleLinks.map((entry) => (
          <div key={entry.key} className="module-upload-year">
            <h4>{entry.label}</h4>
            <div className="module-upload-panels">
              {entry.modules.map((moduleName) => (
                <div key={`${entry.key}-${moduleName}`} className="module-upload-panel">
                  <div className="module-upload-name">{moduleName}</div>
                  <div className="module-upload-actions">
                    <Link
                      className="btn-ghost-sm"
                      to={`/profile/modules/upload?year=${entry.key}&module=${encodeURIComponent(moduleName)}&listType=student`}
                    >
                      Upload Student List
                    </Link>
                    <Link
                      className="btn-ghost-sm"
                      to={`/profile/modules/upload?year=${entry.key}&module=${encodeURIComponent(moduleName)}&listType=lecturer`}
                    >
                      Upload Lecturer List
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
