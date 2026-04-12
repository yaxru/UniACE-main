import { useState, useEffect } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

// ── Group Card ─────────────────────────────────────────────────────────────────
function GroupCard({ group, userId, onJoin, onLeave, joining }) {
  const isMember = group.members.some(
    (m) => m._id === userId || m._id?.toString() === userId,
  );
  const isFull = group.members.length >= 8;
  const isCreator =
    group.createdBy === userId || group.createdBy?.toString() === userId;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 flex flex-col gap-3 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-base truncate">
            {group.name}
          </h3>
          {group.description && (
            <p className="text-sm text-gray-500/80 mt-0.5 line-clamp-2">
              {group.description}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${
            isFull
              ? "bg-red-50 text-red-500 border-red-200"
              : "bg-gray-50 text-gray-500 border-gray-200"
          }`}
        >
          {group.members.length}/8
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {group.faculty && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200">
            {group.faculty}
          </span>
        )}
        {group.batch && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200">
            {group.batch}
          </span>
        )}
        {group.studyMethod && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200">
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
              className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-mono border border-zinc-200"
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
              className="w-7 h-7 rounded-full bg-zinc-800 text-white text-xs flex items-center justify-center border-2 border-white font-medium uppercase"
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
        {group.score !== undefined && group.score > 0 && (
          <span className="ml-auto text-xs text-gray-400">
            {group.score} match pts
          </span>
        )}
      </div>

      {/* Action */}
      <div className="mt-auto pt-1">
        {isMember ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
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
                className="text-xs text-red-400 hover:text-red-600 underline disabled:opacity-50"
              >
                Leave
              </button>
            )}
          </div>
        ) : isFull ? (
          <span className="text-xs text-gray-400">Group is full</span>
        ) : (
          <button
            onClick={() => onJoin(group._id)}
            disabled={joining === group._id}
            className="w-full h-9 rounded-full bg-zinc-900 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
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

  const inputCls =
    "tw-page w-full bg-transparent border border-gray-300/60 h-11 rounded-full px-5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors";
  const selectCls =
    "tw-page w-full bg-white border border-gray-300/60 h-11 rounded-full px-5 text-sm text-gray-700 outline-none focus:border-gray-400 transition-colors";

  return (
    <div className="tw-page fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-7 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl text-gray-900 font-medium">Create Group</h2>
            <p className="text-sm text-gray-500/80 mt-1">
              Set up your study group
            </p>
          </div>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Group name *"
            className={inputCls}
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description (optional)"
            className="tw-page w-full bg-transparent border border-gray-300/60 rounded-2xl px-5 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors h-20 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              name="faculty"
              value={form.faculty}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Any Faculty</option>
              <option>IT</option>
              <option>Business</option>
              <option>Engineering</option>
              <option>Science</option>
            </select>
            <select
              name="batch"
              value={form.batch}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Any Batch</option>
              <option>Weekday</option>
              <option>Weekend</option>
            </select>
          </div>
          <select
            name="studyMethod"
            value={form.studyMethod}
            onChange={handleChange}
            className={selectCls}
          >
            <option value="">Any Study Method</option>
            <option>Online</option>
            <option>In-person</option>
            <option>Both</option>
          </select>
          <div>
            <input
              name="modules"
              value={form.modules}
              onChange={handleChange}
              placeholder="Modules (e.g. SE3040, IT3060)"
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1.5 pl-2">
              Separate module codes with commas
            </p>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-full border border-gray-300/60 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-full bg-zinc-900 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
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
  const groups =
    { Suggested: suggested, "My Groups": mine, "All Groups": all }[activeTab] ||
    [];

  return (
    <div className="tw-page min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl text-gray-900 font-medium">Study Groups</h1>
            <p className="text-sm text-gray-500/90 mt-2">
              Find and join groups matched to your profile. Max 8 members per
              group.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 h-11 rounded-full bg-zinc-900 text-white text-sm font-medium hover:opacity-90 transition-opacity"
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
          <div className="mb-6 bg-amber-50 border border-amber-200/80 rounded-2xl px-5 py-4 text-sm text-amber-800">
            <strong>Complete your profile</strong> to get personalised
            recommendations.{" "}
            <a href="/onboarding" className="underline font-medium">
              Finish onboarding →
            </a>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200/80 rounded-2xl px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-full w-fit mb-8">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
              {tab === "My Groups" && mine.length > 0 && (
                <span className="ml-1.5 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                  {mine.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "Suggested" && (
          <p className="text-xs text-gray-400/90 mb-5">
            Groups ranked by how well they match your faculty, batch, study
            method, and modules.
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
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
            <p className="text-gray-500/90 font-medium mb-4">
              {activeTab === "My Groups"
                ? "You haven't joined any groups yet"
                : activeTab === "Suggested"
                  ? "No matching groups found — try creating one!"
                  : "No study groups yet — be the first to create one!"}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 h-11 rounded-full bg-zinc-900 text-white text-sm font-medium hover:opacity-90 transition-opacity"
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
