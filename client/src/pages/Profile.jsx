import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const ROLES = ['student', 'senior student', 'lecturer'];
const YEAR_SECTIONS = [
  { key: 'year1', label: 'Year 1' },
  { key: 'year2', label: 'Year 2' },
  { key: 'year3', label: 'Year 3' },
  { key: 'year4', label: 'Year 4' },
];

const EMPTY_MODULES = {
  year1: [],
  year2: [],
  year3: [],
  year4: [],
};

function normalizeModulesByYear(input) {
  if (!input || typeof input !== 'object') {
    return { ...EMPTY_MODULES };
  }

  return {
    year1: Array.isArray(input.year1) ? input.year1.filter((m) => typeof m === 'string') : [],
    year2: Array.isArray(input.year2) ? input.year2.filter((m) => typeof m === 'string') : [],
    year3: Array.isArray(input.year3) ? input.year3.filter((m) => typeof m === 'string') : [],
    year4: Array.isArray(input.year4) ? input.year4.filter((m) => typeof m === 'string') : [],
  };
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm]       = useState({ name: '', phone: '', itNumber: '', role: '' });
  const [savedItNumber, setSavedItNumber] = useState('');
  const [communityModules, setCommunityModules] = useState({ ...EMPTY_MODULES });
  const [selectedModulesByYear, setSelectedModulesByYear] = useState({ ...EMPTY_MODULES });
  const [modulesLoading, setModulesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!hasItItNumber) return;
    fetchCommunityModules();
  }, [form.itNumber]);

  async function fetchProfile() {
    try {
      const { data } = await api.get('/profile');
      setForm({
        name:  data.name  || '',
        phone: data.phone || '',
        itNumber: data.itNumber || '',
        role:  data.role  || '',
      });
      setSavedItNumber(data.itNumber || '');
      setSelectedModulesByYear(normalizeModulesByYear(data.modulesByYear));
    } catch {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCommunityModules() {
    setModulesLoading(true);
    try {
      const { data } = await api.get('/profile/modules/public');
      setCommunityModules(normalizeModulesByYear(data));
    } catch {
      setCommunityModules({ ...EMPTY_MODULES });
    } finally {
      setModulesLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    const payload = { ...form };
    if (hasItItNumber) {
      payload.modulesByYear = selectedModulesByYear;
    }

    try {
      const { data } = await api.put('/profile', payload);
      updateUser({
        ...user,
        name:  data.name,
        phone: data.phone,
        itNumber: data.itNumber,
        role:  data.role,
        modulesByYear: data.modulesByYear,
      });
      setSavedItNumber(data.itNumber || '');
      setSelectedModulesByYear(normalizeModulesByYear(data.modulesByYear));
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function toggleModule(yearKey, moduleName, checked) {
    setSelectedModulesByYear((prev) => {
      const current = Array.isArray(prev[yearKey]) ? prev[yearKey] : [];
      const next = checked
        ? Array.from(new Set([...current, moduleName]))
        : current.filter((m) => m !== moduleName);

      return {
        ...prev,
        [yearKey]: next,
      };
    });
  }

  const hasLicItNumber = savedItNumber.trim().toUpperCase().startsWith('LIC');
  const hasItItNumber = form.itNumber.trim().toUpperCase().startsWith('IT');
  const hasAnyCommunityModules = YEAR_SECTIONS.some((section) => communityModules[section.key].length > 0);

  if (loading) return <p className="state-msg">Loading profile…</p>;

  return (
    <div className="profile-card">
      <div className="profile-header">
        <div className="avatar">{user?.username?.[0]?.toUpperCase()}</div>
        <div>
          <h2>{user?.username}</h2>
          {user?.role && <span className="role-badge">{user.role}</span>}
        </div>
      </div>

      <h3 className="section-label" style={{ marginTop: '1.5rem' }}>Edit Profile</h3>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name <span className="optional">(optional)</span></label>
          <input
            id="name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your full name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone Number <span className="optional">(optional)</span></label>
          <input
            id="phone"
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="e.g. +60 12-345 6789"
          />
        </div>
        <div className="form-group">
          <label htmlFor="itNumber">IT Number <span className="optional">(optional)</span></label>
          <input
            id="itNumber"
            type="text"
            name="itNumber"
            value={form.itNumber}
            onChange={handleChange}
            placeholder="e.g. IT20231234"
          />
        </div>

        {hasItItNumber && (
          <div className="profile-module-picker">
            <h4>Select Modules</h4>
            <p>Pick your modules from Community Modules by year.</p>

            {modulesLoading && <p className="state-msg" style={{ textAlign: 'left', padding: 0 }}>Loading available modules…</p>}

            {!modulesLoading && !hasAnyCommunityModules && (
              <p className="home-modules-empty">No community modules available yet.</p>
            )}

            {!modulesLoading && hasAnyCommunityModules && YEAR_SECTIONS.map((section) => {
              const options = communityModules[section.key];
              if (options.length === 0) return null;

              return (
                <div key={section.key} className="profile-modules-year">
                  <h5>{section.label}</h5>
                  <div className="profile-module-options">
                    {options.map((moduleName) => (
                      <label key={`${section.key}-${moduleName}`} className="profile-module-option">
                        <input
                          type="checkbox"
                          checked={selectedModulesByYear[section.key].includes(moduleName)}
                          onChange={(e) => toggleModule(section.key, moduleName, e.target.checked)}
                        />
                        <span>{moduleName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasLicItNumber && (
          <div className="profile-lic-actions">
            <p className="state-msg" style={{ textAlign: 'left', padding: 0 }}>
              LIC IT number detected. You can manage modules for Year 1 to Year 4.
            </p>
            <Link to="/profile/modules" className="btn btn-secondary">
              Add Modules (Year 1 - Year 4)
            </Link>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="role">Role <span className="optional">(optional)</span></label>
          <select id="role" name="role" value={form.role} onChange={handleChange}>
            <option value="">— Select a role —</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {success && <p className="success-msg">{success}</p>}
        {error   && <p className="error-msg">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
