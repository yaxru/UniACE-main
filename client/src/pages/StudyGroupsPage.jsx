import { useState, useEffect } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const FACULTY_COLORS = {
  IT: "bg-blue-100 text-blue-700",
  Business: "bg-yellow-100 text-yellow-700",
  Engineering: "bg-orange-100 text-orange-700",
  Science: "bg-green-100 text-green-700",
};

const METHOD_COLORS = {
  Online: "bg-purple-100 text-purple-700",
  "In-person": "bg-pink-100 text-pink-700",
  Both: "bg-indigo-100 text-indigo-700",
};

// ── Group Card ─────────────────────────────────────────────────────────────────
function GroupCard({ group, userId, onJoin, onLeave, joining }) {
  const isMember = group.members.some(
    (m) => m._id === userId || m._id?.toString() === userId,
  );
  const isFull = group.members.length >= 8;
  const isCreator =
    group.createdBy === userId || group.createdBy?.toString() === userId;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base truncate">
            {group.name}
          </h3>
          {group.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              {group.description}
            </p>
          )}
        </div>
        {/* Member count badge */}
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${isFull ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}
        >
          {group.members.length}/8
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {group.faculty && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${FACULTY_COLORS[group.faculty] || "bg-gray-100 text-gray-600"}`}
          >
            {group.faculty}
          </span>
        )}
        {group.batch && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
            {group.batch}
          </span>
        )}
        {group.studyMethod && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${METHOD_COLORS[group.studyMethod] || "bg-gray-100 text-gray-600"}`}
          >
            {group.studyMethod}
          </span>
        )}
      </div>

      {/* Modules */}
      {group.modules && group.modules.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {group.modules.map((m) => (
            <span
              key={m}
              className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono"
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {/* Members avatars */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {group.members.slice(0, 5).map((m, i) => (
            <div
              key={m._id || i}
              title={m.name || m.username}
              className="w-7 h-7 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center border-2 border-white font-medium uppercase"
            >
              {(m.name || m.username || "?")[0]}
            </div>
          ))}
          {group.members.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center border-2 border-white font-medium">
              +{group.members.length - 5}
            </div>
          )}
        </div>
        {group.members.length === 0 && (
          <span className="text-xs text-gray-400">No members yet</span>
        )}
      </div>

      {/* Match score badge */}
      {group.score !== undefined && group.score > 0 && (
        <div className="flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 text-indigo-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-xs text-indigo-600 font-medium">
            {group.score} match points
          </span>
        </div>
      )}

      {/* Action button */}
      <div className="mt-auto pt-1">
        {isMember ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {isCreator ? "Your group" : "Joined"}
            </span>
            {!isCreator && (
              <button
                onClick={() => onLeave(group._id)}
                disabled={joining === group._id}
                className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
              >
                Leave
              </button>
            )}
          </div>
        ) : isFull ? (
          <span className="text-xs text-gray-400 font-medium">
            Group is full
          </span>
        ) : (
          <button
            onClick={() => onJoin(group._id)}
            disabled={joining === group._id}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {joining === group._id ? "Joining..." : "Join Group"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Create Group Modal ─────────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreate, user }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    faculty: user?.faculty || "",
    batch: user?.batch || "",
    studyMethod: user?.studyMethod || "",
    modules: user?.currentModules?.join(", ") || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Group name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onCreate(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            Create Study Group
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. SE3040 Study Squad"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="What will this group focus on?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Faculty
              </label>
              <select
                name="faculty"
                value={form.faculty}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Any</option>
                <option>IT</option>
                <option>Business</option>
                <option>Engineering</option>
                <option>Science</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch
              </label>
              <select
                name="batch"
                value={form.batch}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Any</option>
                <option>Weekday</option>
                <option>Weekend</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Study Method
            </label>
            <select
              name="studyMethod"
              value={form.studyMethod}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Any</option>
              <option>Online</option>
              <option>In-person</option>
              <option>Both</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modules
            </label>
            <input
              name="modules"
              value={form.modules}
              onChange={handleChange}
              placeholder="e.g. SE3040, SE3050, IT3060"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Separate module codes with commas
            </p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const TABS = ["Suggested", "My Groups", "All Groups"];

export default function StudyGroupsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Suggested");
  const [suggested, setSuggested] = useState([]);
  const [mine, setMine] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError("");
    try {
      const [sugRes, mineRes, allRes] = await Promise.all([
        api.get("/studygroups/suggest"),
        api.get("/studygroups/mine"),
        api.get("/studygroups"),
      ]);
      setSuggested(sugRes.data);
      setMine(mineRes.data);
      setAll(allRes.data);
    } catch {
      setError("Failed to load study groups. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(groupId) {
    setJoining(groupId);
    try {
      await api.post(`/studygroups/${groupId}/join`);
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join group");
    } finally {
      setJoining(null);
    }
  }

  async function handleLeave(groupId) {
    setJoining(groupId);
    try {
      await api.delete(`/studygroups/${groupId}/leave`);
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to leave group");
    } finally {
      setJoining(null);
    }
  }

  async function handleCreate(form) {
    await api.post("/studygroups", form);
    await fetchAll();
  }

  const userId = user?.id || user?._id;
  const tabData = {
    Suggested: suggested,
    "My Groups": mine,
    "All Groups": all,
  };
  const groups = tabData[activeTab] || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Study Groups</h1>
            <p className="text-sm text-gray-500 mt-1">
              Find and join study groups matched to your profile. Max 8 members
              per group.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Group
          </button>
        </div>

        {/* Onboarding nudge */}
        {user && !user.onboardingComplete && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Complete your profile</strong> to get personalised study
            group recommendations.{" "}
            <a href="/onboarding" className="underline font-medium">
              Finish onboarding →
            </a>
          </div>
        )}

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
              {tab === "My Groups" && mine.length > 0 && (
                <span className="ml-1.5 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">
                  {mine.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Suggested description */}
        {activeTab === "Suggested" && (
          <p className="text-xs text-gray-400 mb-4">
            Groups are ranked by how well they match your faculty, batch, study
            method, and current modules.
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">
              {activeTab === "My Groups"
                ? "You haven't joined any groups yet"
                : activeTab === "Suggested"
                  ? "No matching groups found — try creating one!"
                  : "No study groups yet — be the first to create one!"}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Create a Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <GroupCard
                key={group._id}
                group={group}
                userId={userId}
                onJoin={handleJoin}
                onLeave={handleLeave}
                joining={joining}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGroupModal
          user={user}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
