import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [modulesLoading, setModulesLoading] = useState(false);
  const [publicModules, setPublicModules] = useState({ year1: [], year2: [], year3: [], year4: [] });
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [selectedEvaluationGroups, setSelectedEvaluationGroups] = useState([]);

  const moduleSections = [
    { key: 'year1', label: 'Year 1' },
    { key: 'year2', label: 'Year 2' },
    { key: 'year3', label: 'Year 3' },
    { key: 'year4', label: 'Year 4' },
  ]
    .map((section) => ({
      ...section,
      modules: Array.isArray(publicModules[section.key]) ? publicModules[section.key] : [],
    }))
    .filter((section) => section.modules.length > 0);

  useEffect(() => {
    fetchUsers();
    fetchPublicModules();
    fetchSelectedEvaluationGroups();
  }, []);

  async function fetchUsers() {
    setUsersLoading(true);
    setUsersError('');
    try {
      const { data } = await api.get('/profile/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsersError('Failed to load users. Please refresh.');
    } finally {
      setUsersLoading(false);
    }
  }

  async function fetchPublicModules() {
    setModulesLoading(true);
    try {
      const { data } = await api.get('/profile/modules/public');
      setPublicModules({
        year1: Array.isArray(data.year1) ? data.year1 : [],
        year2: Array.isArray(data.year2) ? data.year2 : [],
        year3: Array.isArray(data.year3) ? data.year3 : [],
        year4: Array.isArray(data.year4) ? data.year4 : [],
      });
    } catch {
      // Keep feed usable even if shared modules fail to load.
    } finally {
      setModulesLoading(false);
    }
  }

  async function fetchSelectedEvaluationGroups() {
    setEvaluationLoading(true);
    try {
      const { data } = await api.get('/module-rosters/evaluation-groups/selected');
      setSelectedEvaluationGroups(Array.isArray(data) ? data : []);
    } catch {
      setSelectedEvaluationGroups([]);
    } finally {
      setEvaluationLoading(false);
    }
  }

  return (
    <div>
      <div className="home-modules-card">
        <h3>Community Members</h3>

        {usersLoading && <p className="state-msg" style={{ textAlign: 'left', padding: 0 }}>Loading users…</p>}
        {!usersLoading && usersError && <p className="error-msg">{usersError}</p>}

        {!usersLoading && !usersError && users.length === 0 && (
          <p className="home-modules-empty">No users found yet.</p>
        )}

        {!usersLoading && !usersError && users.length > 0 && (
          <div className="home-evaluation-grid">
            {users.map((member) => {
              const displayName = member.name?.trim() || member.username;
              const memberRole = member.role?.trim() || 'User';
              const modulesByYear = member.modulesByYear || {};
              const selectedModules = [
                { key: 'year1', label: 'Year 1' },
                { key: 'year2', label: 'Year 2' },
                { key: 'year3', label: 'Year 3' },
                { key: 'year4', label: 'Year 4' },
              ]
                .map((year) => ({
                  ...year,
                  modules: Array.isArray(modulesByYear[year.key]) ? modulesByYear[year.key] : [],
                }))
                .filter((year) => year.modules.length > 0);

              return (
                <article key={member._id} className="home-evaluation-card">
                  <div className="home-evaluation-head">
                    <h4>{displayName}</h4>
                    <span>{memberRole}</span>
                  </div>

                  <p className="home-evaluation-meta">Username: {member.username}</p>
                  {member.itNumber && <p className="home-evaluation-meta">IT Number: {member.itNumber}</p>}

                  <div className="profile-preview profile-module-list">
                    <p><strong>Selected Modules:</strong></p>
                    {selectedModules.length === 0 && <p>None selected.</p>}
                    {selectedModules.map((year) => (
                      <p key={`${member._id}-${year.key}`}>
                        <strong>{year.label}:</strong> {year.modules.join(', ')}
                      </p>
                    ))}
                  </div>

                  {member._id !== user?.id && (
                    <button
                      type="button"
                      className="btn btn-primary btn-chat"
                      onClick={() => navigate(`/inbox?userId=${member._id}`)}
                    >
                      Chat
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="home-modules-card">
        <h3>Community Modules</h3>
        {modulesLoading && <p className="state-msg" style={{ textAlign: 'left', padding: 0 }}>Loading modules…</p>}
        {!modulesLoading && moduleSections.length === 0 && (
          <p className="home-modules-empty">No modules shared yet.</p>
        )}
        {!modulesLoading && moduleSections.length > 0 && (
          <div className="home-modules-grid">
            {moduleSections.map((section) => (
              <div key={section.key} className="home-modules-year">
                <h4>{section.label}</h4>
                <ul>
                  {section.modules.map((moduleName, index) => (
                    <li key={`${section.key}-${index}`}>{moduleName}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="home-modules-card">
        <h3>Assignment Evaluation Groups (My Selected Modules)</h3>
        {evaluationLoading && <p className="state-msg" style={{ textAlign: 'left', padding: 0 }}>Loading evaluation groups…</p>}

        {!evaluationLoading && selectedEvaluationGroups.length === 0 && (
          <p className="home-modules-empty">No selected modules found yet. Select modules in your profile first.</p>
        )}

        {!evaluationLoading && selectedEvaluationGroups.length > 0 && (
          <div className="home-evaluation-grid">
            {selectedEvaluationGroups.map((moduleEntry) => {
              const hasGroups = moduleEntry.groups.length > 0;
              const yearLabel = moduleEntry.yearKey.replace('year', 'Year ');

              return (
                <article key={`${moduleEntry.yearKey}-${moduleEntry.moduleName}`} className="home-evaluation-card">
                  <div className="home-evaluation-head">
                    <h4>{moduleEntry.moduleName}</h4>
                    <span>{yearLabel}</span>
                  </div>

                  {!moduleEntry.hasStudentRoster && (
                    <p className="home-modules-empty">Student list not uploaded yet.</p>
                  )}

                  {moduleEntry.hasStudentRoster && !moduleEntry.hasLecturerRoster && (
                    <p className="home-modules-empty">Lecturer list not uploaded yet.</p>
                  )}

                  {moduleEntry.hasStudentRoster && moduleEntry.hasLecturerRoster && !hasGroups && (
                    <p className="home-modules-empty">No valid student groups found.</p>
                  )}

                  {hasGroups && (
                    <div className="home-evaluation-groups">
                      {moduleEntry.groups.map((group) => (
                        <div key={`${moduleEntry.moduleName}-${group.groupNo}-${group.groupName}`} className="home-evaluation-group">
                          <p className="home-evaluation-group-title">
                            {group.groupName} (Group {group.groupNo})
                          </p>
                          <p className="home-evaluation-evaluator">
                            Evaluator: {group.evaluator
                              ? `${group.evaluator.studentName} (${group.evaluator.itNumber})`
                              : 'Not assigned'}
                          </p>
                          <p className="home-evaluation-meta">Students: {group.students.length}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
