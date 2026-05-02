import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const avatarColors = [
  "bg-zinc-800",
  "bg-zinc-700",
  "bg-stone-700",
  "bg-zinc-600",
  "bg-stone-600",
  "bg-zinc-500",
  "bg-stone-500",
  "bg-zinc-400",
];

function SectionShell({ title, subtitle, loading, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-100">
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="px-8 py-6">
        {loading ? <p className="text-sm text-gray-400">Loading…</p> : children}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [modulesLoading, setModulesLoading] = useState(false);
  const [publicModules, setPublicModules] = useState({
    year1: [],
    year2: [],
    year3: [],
    year4: [],
  });
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [selectedEvaluationGroups, setSelectedEvaluationGroups] = useState([]);

  const moduleSections = [
    { key: "year1", label: "Year 1" },
    { key: "year2", label: "Year 2" },
    { key: "year3", label: "Year 3" },
    { key: "year4", label: "Year 4" },
  ]
    .map((section) => ({
      ...section,
      modules: Array.isArray(publicModules[section.key])
        ? publicModules[section.key]
        : [],
    }))
    .filter((section) => section.modules.length > 0);

  useEffect(() => {
    fetchUsers();
    fetchPublicModules();
    fetchSelectedEvaluationGroups();
  }, []);

  async function fetchUsers() {
    setUsersLoading(true);
    setUsersError("");
    try {
      const { data } = await api.get("/profile/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsersError("Failed to load users. Please refresh.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function fetchPublicModules() {
    setModulesLoading(true);
    try {
      const { data } = await api.get("/profile/modules/public");
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
      const { data } = await api.get(
        "/module-rosters/evaluation-groups/selected",
      );
      setSelectedEvaluationGroups(Array.isArray(data) ? data : []);
    } catch {
      setSelectedEvaluationGroups([]);
    } finally {
      setEvaluationLoading(false);
    }
  }

  return (
    <div className="tw-page max-w-7xl mx-auto px-4 py-10 flex flex-col gap-8">
      {/* ── Community Members ── */}
      <SectionShell
        title="Community Members"
        subtitle="Browse everyone in the community and start a conversation"
        loading={usersLoading}
      >
        {usersError && <p className="text-sm text-red-500">{usersError}</p>}

        {!usersError && users.length === 0 && (
          <p className="text-sm text-gray-400">No users found yet.</p>
        )}

        {!usersError && users.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((member, i) => {
              const displayName = member.name?.trim() || member.username;
              const memberRole = member.role?.trim() || "User";
              const modulesByYear = member.modulesByYear || {};
              const selectedModules = [
                { key: "year1", label: "Year 1" },
                { key: "year2", label: "Year 2" },
                { key: "year3", label: "Year 3" },
                { key: "year4", label: "Year 4" },
              ]
                .map((year) => ({
                  ...year,
                  modules: Array.isArray(modulesByYear[year.key])
                    ? modulesByYear[year.key]
                    : [],
                }))
                .filter((year) => year.modules.length > 0);

              return (
                <article
                  key={member._id}
                  className="flex flex-col gap-3 p-5 rounded-xl border border-gray-100 bg-slate-50 hover:border-gray-200 transition-colors"
                >
                  {/* Avatar + name row */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${avatarColors[i % avatarColors.length]} text-white text-sm flex items-center justify-center font-semibold uppercase shrink-0`}
                    >
                      {displayName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-400">{memberRole}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-stone-100 text-stone-600 border-stone-200">
                      @{member.username}
                    </span>
                    {member.itNumber && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-amber-50 text-amber-800 border-amber-200">
                        {member.itNumber}
                      </span>
                    )}
                  </div>

                  {/* Modules */}
                  {selectedModules.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Modules
                      </p>
                      {selectedModules.map((year) => (
                        <p
                          key={`${member._id}-${year.key}`}
                          className="text-xs text-gray-600"
                        >
                          <span className="font-medium text-gray-700">
                            {year.label}:
                          </span>{" "}
                          {year.modules.join(", ")}
                        </p>
                      ))}
                    </div>
                  )}
                  {selectedModules.length === 0 && (
                    <p className="text-xs text-gray-400">
                      No modules selected.
                    </p>
                  )}

                  {/* Chat button */}
                  {member._id !== user?.id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/inbox?userId=${member._id}`)}
                      className="mt-auto w-full h-9 rounded-full bg-zinc-900 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Chat
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </SectionShell>

      {/* ── Community Modules ── */}
      <SectionShell
        title="Community Modules"
        subtitle="Modules shared by members across all years"
        loading={modulesLoading}
      >
        {moduleSections.length === 0 && (
          <p className="text-sm text-gray-400">No modules shared yet.</p>
        )}

        {moduleSections.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {moduleSections.map((section) => (
              <div key={section.key}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {section.label}
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {section.modules.map((moduleName, index) => (
                    <li
                      key={`${section.key}-${index}`}
                      className="text-sm bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg font-mono border border-stone-200"
                    >
                      {moduleName}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SectionShell>

      {/* ── Assignment Evaluation Groups ── */}
      <SectionShell
        title="Assignment Evaluation Groups"
        subtitle="Groups for your selected modules"
        loading={evaluationLoading}
      >
        {selectedEvaluationGroups.length === 0 && (
          <p className="text-sm text-gray-400">
            No selected modules found yet. Select modules in your profile first.
          </p>
        )}

        {selectedEvaluationGroups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedEvaluationGroups.map((moduleEntry) => {
              const hasGroups = moduleEntry.groups.length > 0;
              const yearLabel = moduleEntry.yearKey.replace("year", "Year ");

              return (
                <article
                  key={`${moduleEntry.yearKey}-${moduleEntry.moduleName}`}
                  className="flex flex-col gap-4 p-5 rounded-xl border border-gray-100 bg-slate-50 hover:border-gray-200 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {moduleEntry.moduleName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium border bg-amber-50 text-amber-800 border-amber-200">
                      {yearLabel}
                    </span>
                  </div>

                  {/* Status messages */}
                  {!moduleEntry.hasStudentRoster && (
                    <p className="text-xs text-gray-400">
                      Student list not uploaded yet.
                    </p>
                  )}
                  {moduleEntry.hasStudentRoster &&
                    !moduleEntry.hasLecturerRoster && (
                      <p className="text-xs text-gray-400">
                        Lecturer list not uploaded yet.
                      </p>
                    )}
                  {moduleEntry.hasStudentRoster &&
                    moduleEntry.hasLecturerRoster &&
                    !hasGroups && (
                      <p className="text-xs text-gray-400">
                        No valid student groups found.
                      </p>
                    )}

                  {/* Groups */}
                  {hasGroups && (
                    <div className="flex flex-col gap-2">
                      {moduleEntry.groups.map((group) => (
                        <div
                          key={`${moduleEntry.moduleName}-${group.groupNo}-${group.groupName}`}
                          className="p-3 rounded-lg border border-gray-100 bg-white"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold text-gray-800">
                              {group.groupName}
                            </p>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-600">
                              Group {group.groupNo}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Evaluator:{" "}
                            <span className="font-medium text-gray-700">
                              {group.evaluator
                                ? `${group.evaluator.studentName} (${group.evaluator.itNumber})`
                                : "Not assigned"}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {group.students.length} student
                            {group.students.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </SectionShell>
    </div>
  );
}
