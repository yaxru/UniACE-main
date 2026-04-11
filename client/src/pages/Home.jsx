import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import QuestionCard from '../components/QuestionCard';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [fetchError, setFetchError] = useState('');
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
    fetchQuestions();
    fetchPublicModules();
    fetchSelectedEvaluationGroups();
  }, []);

  async function fetchQuestions() {
    try {
      const { data } = await api.get('/questions');
      setQuestions(data);
    } catch {
      setFetchError('Failed to load questions. Please refresh.');
    } finally {
      setLoading(false);
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

  async function handlePost(e) {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setPosting(true);
    setPostError('');
    try {
      const { data } = await api.post('/questions', { text: newQuestion });
      setQuestions([data, ...questions]);
      setNewQuestion('');
    } catch (err) {
      setPostError(err.response?.data?.message || 'Failed to post question.');
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this question? All its comments will also be removed.')) return;
    try {
      await api.delete(`/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch {
      alert('Failed to delete question.');
    }
  }

  async function handleEdit(id, newText) {
    const { data } = await api.put(`/questions/${id}`, { text: newText });
    setQuestions((prev) => prev.map((q) => (q._id === id ? data : q)));
  }

  return (
    <div>
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

      {/* Post Question Box */}
      <div className="post-box">
        <h3>Ask a Question</h3>
        <form onSubmit={handlePost}>
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="What would you like to ask the university community?"
            rows={3}
            required
          />
          {postError && <p className="error-msg">{postError}</p>}
          <div className="post-box-footer">
            <button type="submit" className="btn btn-primary" disabled={posting}>
              {posting ? 'Posting…' : 'Post Question'}
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      <p className="section-label">Recent Questions</p>

      {loading && <p className="state-msg">Loading questions…</p>}
      {fetchError && <p className="error-msg">{fetchError}</p>}

      {!loading && !fetchError && questions.length === 0 && (
        <p className="state-msg">No questions yet, be the first to ask!</p>
      )}

      {questions.map((q) => (
        <QuestionCard
          key={q._id}
          question={q}
          currentUserId={user?.id}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onView={() => navigate(`/questions/${q._id}`)}
          onChat={(userId) => navigate(`/inbox?userId=${userId}`)}
        />
      ))}
    </div>
  );
}
