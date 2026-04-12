import { useState, useEffect } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

// ── Shared tag styles ──────────────────────────────────────────────────────────
const TAG_CLS = "text-xs px-2.5 py-1 rounded-full font-medium border";
// Faculty → amber tint
// Batch   → dark/black sage
// Method  → muted amber-stone

function FacultyTag({ value }) {
  if (!value) return null;
  return (
    <span className={`${TAG_CLS} bg-amber-50 text-amber-800 border-amber-200`}>
      {value}
    </span>
  );
}
function BatchTag({ value }) {
  if (!value) return null;
  return (
    <span className={`${TAG_CLS} bg-zinc-800 text-zinc-100 border-zinc-700`}>
      {value}
    </span>
  );
}
function MethodTag({ value }) {
  if (!value) return null;
  return (
    <span className={`${TAG_CLS} bg-stone-100 text-stone-600 border-stone-200`}>
      {value}
    </span>
  );
}

// ── Group List Row (left panel) ────────────────────────────────────────────────
function GroupRow({ group, userId, selected, onClick }) {
  const isMember = group.members.some(
    (m) => m._id === userId || m._id?.toString() === userId,
  );
  const isFull = group.members.length >= 8;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-4 rounded-xl transition-colors flex flex-col bg-slate-100 gap-2 ${
        selected
          ? "bg-zinc-900 text-white"
          : "hover:bg-gray-50 border border-transparent hover:border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2 ">
        <span
          className={`font-medium text-sm truncate ${selected ? "text-white" : "text-gray-900"}`}
        >
          {group.name}
        </span>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
            isFull
              ? selected
                ? "bg-red-400/30 text-red-200"
                : "bg-red-50 text-red-500"
              : selected
                ? "bg-white/20 text-white/80"
                : "bg-gray-100 text-gray-500"
          }`}
        >
          {group.members.length}/8
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {group.faculty && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              selected
                ? "bg-white/15 text-white/90 border-white/20"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            {group.faculty}
          </span>
        )}
        {group.batch && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              selected
                ? "bg-white/15 text-white/90 border-white/20"
                : "bg-zinc-800 text-zinc-100 border-zinc-700"
            }`}
          >
            {group.batch}
          </span>
        )}
        {isMember && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              selected
                ? "bg-amber-300/30 text-amber-200"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            ✓ Joined
          </span>
        )}
      </div>
    </button>
  );
}

// ── Group Detail Panel (right panel) ──────────────────────────────────────────
function GroupDetail({ group, userId, onJoin, onLeave, joining, onClose }) {
  if (!group) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
          <svg
            className="w-10 h-10 text-gray-300"
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
        <p className="text-gray-400 text-sm font-medium">
          Select a group to view details
        </p>
      </div>
    );
  }

  const isMember = group.members.some(
    (m) => m._id === userId || m._id?.toString() === userId,
  );
  const isFull = group.members.length >= 8;
  const isCreator =
    group.createdBy === userId || group.createdBy?.toString() === userId;

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

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Detail Header */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-900 leading-tight">
              {group.name}
            </h2>
            {group.description && (
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                {group.description}
              </p>
            )}
          </div>
          {/* Capacity ring */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div
              className={`w-14 h-14 rounded-full border-4 flex items-center justify-center ${
                isFull
                  ? "border-red-200 bg-red-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <span
                className={`text-sm font-bold ${isFull ? "text-red-600" : "text-emerald-700"}`}
              >
                {group.members.length}/8
              </span>
            </div>
            <span
              className={`text-xs font-medium ${isFull ? "text-red-500" : "text-emerald-600"}`}
            >
              {isFull ? "Full" : `${8 - group.members.length} open`}
            </span>
          </div>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-2">
          <FacultyTag value={group.faculty} />
          <BatchTag value={group.batch} />
          <MethodTag value={group.studyMethod} />
          {group.score !== undefined && group.score > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-amber-100 text-amber-900 border-amber-300">
              ★ {group.score} match
            </span>
          )}
        </div>
      </div>

      {/* Modules */}
      {group.modules && group.modules.length > 0 && (
        <div className="px-8 py-5 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Modules
          </h3>
          <div className="flex flex-wrap gap-2">
            {group.modules.map((m) => (
              <span
                key={m}
                className="text-sm bg-stone-100 text-stone-700 px-3 py-1 rounded-lg font-mono border border-stone-200"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="px-8 py-5 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Members · {group.members.length}
        </h3>
        {group.members.length === 0 ? (
          <p className="text-sm text-gray-400">No members yet. Be the first!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {group.members.map((m, i) => (
              <div key={m._id || i} className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${avatarColors[i % avatarColors.length]} text-white text-sm flex items-center justify-center font-semibold uppercase shrink-0`}
                >
                  {(m.name || m.username || "?")[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {m.name || m.username || "Unknown"}
                  </p>
                  {m._id === userId || m._id?.toString() === userId ? (
                    <p className="text-xs text-gray-400">You</p>
                  ) : null}
                </div>
                {(group.createdBy === m._id ||
                  group.createdBy?.toString() === m._id?.toString()) && (
                  <span className="ml-auto text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
                    Creator
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action */}
      <div className="px-8 py-6">
        {isMember ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {isCreator ? "You created this group" : "You're a member"}
            </div>
            {!isCreator && (
              <button
                onClick={() => onLeave(group._id)}
                disabled={joining === group._id}
                className="w-full h-11 rounded-full border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {joining === group._id ? "Leaving..." : "Leave Group"}
              </button>
            )}
          </div>
        ) : isFull ? (
          <div className="h-11 rounded-full bg-gray-100 text-gray-400 text-sm font-medium flex items-center justify-center">
            Group is full
          </div>
        ) : (
          <button
            onClick={() => onJoin(group._id)}
            disabled={joining === group._id}
            className="w-full h-11 rounded-full bg-zinc-900 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
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
  const [selectedGroup, setSelectedGroup] = useState(null);

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

  // Keep selectedGroup in sync after data refresh
  useEffect(() => {
    if (!selectedGroup) return;
    const allGroups = [...suggested, ...mine, ...all];
    const fresh = allGroups.find((g) => g._id === selectedGroup._id);
    if (fresh) setSelectedGroup(fresh);
  }, [suggested, mine, all]);

  const userId = user?.id || user?._id;
  const groups =
    { Suggested: suggested, "My Groups": mine, "All Groups": all }[activeTab] ||
    [];

  return (
    <div
      className="tw-page flex flex-col max-w-7xl mx-auto bg-white  "
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* Top bar */}
      <div className="shrink-0 px-4 py-8 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl text-gray-900 font-semibold">
              Study Groups
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Find and join groups matched to your profile · max 8 members
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 h-10 rounded-full bg-zinc-900 text-white text-sm font-medium hover:opacity-90 transition-opacity"
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

        {user && !user.onboardingComplete && (
          <div className="mb-4 bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-3 text-sm text-amber-800">
            <strong>Complete your profile</strong> to get personalised
            recommendations.{" "}
            <a href="/onboarding" className="underline font-medium">
              Finish onboarding →
            </a>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200/80 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-full w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedGroup(null);
              }}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
      </div>

      {/* Body: left list + right detail */}
      <div className="flex flex-1 overflow-hidden pt-8">
        {/* Left list panel */}
        <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col overflow-hidden bg-white">
          {activeTab === "Suggested" && (
            <p className="text-xs text-gray-400 px-4 pt-4 pb-1">
              Ranked by faculty, batch, study method &amp; modules match.
            </p>
          )}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-7 h-7 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <svg
                    className="w-6 h-6 text-gray-400"
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
                <p className="text-gray-500 text-sm font-medium mb-3">
                  {activeTab === "My Groups"
                    ? "You haven't joined any groups yet"
                    : activeTab === "Suggested"
                      ? "No matching groups found"
                      : "No study groups yet"}
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-4 h-9 rounded-full bg-zinc-900 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Create a Group
                </button>
              </div>
            ) : (
              groups.map((group) => (
                <GroupRow
                  key={group._id}
                  group={group}
                  userId={userId}
                  selected={selectedGroup?._id === group._id}
                  onClick={() => setSelectedGroup(group)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right detail panel */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/40">
          <GroupDetail
            group={selectedGroup}
            userId={userId}
            onJoin={handleJoin}
            onLeave={handleLeave}
            joining={joining}
          />
        </div>
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
