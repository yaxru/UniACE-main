import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const ROLES = ["student", "senior student", "lecturer"];
const YEAR_SECTIONS = [
  { key: "year1", label: "Year 1" },
  { key: "year2", label: "Year 2" },
  { key: "year3", label: "Year 3" },
  { key: "year4", label: "Year 4" },
];

const EMPTY_MODULES = { year1: [], year2: [], year3: [], year4: [] };

function normalizeModulesByYear(input) {
  if (!input || typeof input !== "object") return { ...EMPTY_MODULES };
  return {
    year1: Array.isArray(input.year1)
      ? input.year1.filter((m) => typeof m === "string")
      : [],
    year2: Array.isArray(input.year2)
      ? input.year2.filter((m) => typeof m === "string")
      : [],
    year3: Array.isArray(input.year3)
      ? input.year3.filter((m) => typeof m === "string")
      : [],
    year4: Array.isArray(input.year4)
      ? input.year4.filter((m) => typeof m === "string")
      : [],
  };
}

const inputCls =
  "tw-page w-full bg-transparent border border-gray-300/60 h-11 rounded-full px-5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors";
const selectCls =
  "tw-page w-full bg-white border border-gray-300/60 h-11 rounded-full px-5 text-sm text-gray-700 outline-none focus:border-gray-400 transition-colors";

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 pl-1">
        {label}
        {hint && (
          <span className="text-gray-400 font-normal ml-1 text-xs">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    itNumber: "",
    role: "",
  });
  const [savedItNumber, setSavedItNumber] = useState("");
  const [communityModules, setCommunityModules] = useState({
    ...EMPTY_MODULES,
  });
  const [selectedModulesByYear, setSelectedModulesByYear] = useState({
    ...EMPTY_MODULES,
  });
  const [modulesLoading, setModulesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!hasItItNumber) return;
    fetchCommunityModules();
  }, [form.itNumber]);

  async function fetchProfile() {
    try {
      const { data } = await api.get("/profile");
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        itNumber: data.itNumber || "",
        role: data.role || "",
      });
      setSavedItNumber(data.itNumber || "");
      setSelectedModulesByYear(normalizeModulesByYear(data.modulesByYear));
    } catch {
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCommunityModules() {
    setModulesLoading(true);
    try {
      const { data } = await api.get("/profile/modules/public");
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
    setSuccess("");
    setError("");

    const payload = { ...form };
    if (hasItItNumber) payload.modulesByYear = selectedModulesByYear;

    try {
      const { data } = await api.put("/profile", payload);
      updateUser({
        ...user,
        name: data.name,
        phone: data.phone,
        itNumber: data.itNumber,
        role: data.role,
        modulesByYear: data.modulesByYear,
      });
      setSavedItNumber(data.itNumber || "");
      setSelectedModulesByYear(normalizeModulesByYear(data.modulesByYear));
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
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
      return { ...prev, [yearKey]: next };
    });
  }

  async function handleDeleteProfile() {
    const confirmed = window.confirm(
      "Delete your profile permanently? This will remove your questions, comments, and inbox messages.",
    );
    if (!confirmed) return;

    setDeleting(true);
    setSuccess("");
    setError("");

    try {
      await api.delete("/profile");
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete profile.");
      setDeleting(false);
    }
  }

  const hasLicItNumber = savedItNumber.trim().toUpperCase().startsWith("LIC");
  const hasItItNumber = form.itNumber.trim().toUpperCase().startsWith("IT");
  const hasAnyCommunityModules = YEAR_SECTIONS.some(
    (s) => communityModules[s.key].length > 0,
  );

  const totalSelected = YEAR_SECTIONS.reduce(
    (sum, s) =>
      sum +
      (Array.isArray(selectedModulesByYear[s.key])
        ? selectedModulesByYear[s.key].length
        : 0),
    0,
  );

  if (loading) {
    return (
      <div className="tw-page flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-400">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="tw-page max-w-6xl mx-auto px-4 py-10 flex flex-col gap-6">
      {/* ── Top header bar (full width) ── */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-zinc-900 text-white flex items-center justify-center text-2xl font-semibold uppercase shrink-0">
          {user?.username?.[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold text-gray-900">
            {user?.username}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">{user?.email || ""}</p>
        </div>
        {user?.role && (
          <span className="shrink-0 text-xs px-3 py-1.5 rounded-full font-medium border bg-amber-50 text-amber-800 border-amber-200">
            {user.role}
          </span>
        )}
        {form.itNumber && (
          <span className="shrink-0 text-xs px-3 py-1.5 rounded-full font-medium border bg-zinc-800 text-zinc-100 border-zinc-700">
            {form.itNumber}
          </span>
        )}
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── LEFT: Edit form + Danger zone ── */}
        <div className="flex flex-col gap-6 w-full lg:w-[380px] shrink-0">
          {/* Edit form card */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Profile
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Update your personal details
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="px-6 py-5 flex flex-col gap-4"
            >
              <Field label="Full Name" hint="(optional)">
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className={inputCls}
                />
              </Field>

              <Field label="Phone Number" hint="(optional)">
                <input
                  id="phone"
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. +94 77 123 4567"
                  className={inputCls}
                />
              </Field>

              <Field label="IT Number" hint="(optional)">
                <input
                  id="itNumber"
                  type="text"
                  name="itNumber"
                  value={form.itNumber}
                  onChange={handleChange}
                  placeholder="e.g. IT20231234"
                  className={inputCls}
                />
              </Field>

              <Field label="Role" hint="(optional)">
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className={selectCls}
                >
                  <option value="">- Select a role -</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>

              {success && (
                <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  {success}
                </p>
              )}
              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || deleting}
                className="w-full h-11 rounded-full bg-zinc-900 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mt-1"
              >
                {saving ? "Saving…" : "Save Profile"}
              </button>
            </form>
          </div>

          {/* Danger zone card */}
          <div className="bg-white rounded-lg border border-red-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100">
              <h2 className="text-base font-semibold text-red-600">
                Danger Zone
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Permanent - cannot be undone
              </p>
            </div>
            <div className="px-6 py-4 flex flex-col gap-3">
              <p className="text-sm text-gray-500">
                Deletes your profile, questions, comments, and messages
                permanently.
              </p>
              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={deleting || saving}
                className="w-full h-10 rounded-full border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting…" : "Delete Profile"}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Modules panel ── */}
        <div className="flex-1 min-w-0">
          {/* LIC panel */}
          {hasLicItNumber && (
            <div className="bg-white rounded-lg border border-amber-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-amber-100 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Module Management
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    LIC account - manage modules for Year 1-4
                  </p>
                </div>
                <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium border bg-amber-50 text-amber-800 border-amber-200">
                  LIC
                </span>
              </div>
              <div className="px-6 py-5 flex flex-col gap-3">
                <p className="text-sm text-gray-600">
                  As a LIC user you can add and manage modules for all year
                  groups. Other students can then select from those modules in
                  their profile.
                </p>
                <Link
                  to="/profile/modules"
                  className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-zinc-900 text-white text-sm font-medium hover:opacity-90 transition-opacity w-fit"
                >
                  Manage Modules (Year 1-4)
                </Link>
              </div>
            </div>
          )}

          {/* IT student module picker */}
          {hasItItNumber && (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    My Modules
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Select the modules you are currently enrolled in
                  </p>
                </div>
                {totalSelected > 0 && (
                  <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium border bg-zinc-800 text-zinc-100 border-zinc-700">
                    {totalSelected} selected
                  </span>
                )}
              </div>

              <div className="px-6 py-5 flex flex-col gap-5">
                {modulesLoading && (
                  <p className="text-sm text-gray-400">
                    Loading available modules…
                  </p>
                )}

                {!modulesLoading && !hasAnyCommunityModules && (
                  <p className="text-sm text-gray-400">
                    No community modules available yet.
                  </p>
                )}

                {!modulesLoading && hasAnyCommunityModules && (
                  <div className="flex flex-col gap-5">
                    {YEAR_SECTIONS.map((section) => {
                      const options = communityModules[section.key];
                      if (options.length === 0) return null;
                      const selectedInYear =
                        selectedModulesByYear[section.key] || [];
                      return (
                        <div key={section.key}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              {section.label}
                            </p>
                            {selectedInYear.length > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded-md font-medium bg-zinc-100 text-zinc-600">
                                {selectedInYear.length}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {options.map((moduleName) => {
                              const checked =
                                selectedInYear.includes(moduleName);
                              return (
                                <label
                                  key={`${section.key}-${moduleName}`}
                                  className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg border font-mono font-medium transition-colors select-none ${
                                    checked
                                      ? "bg-zinc-900 text-white border-zinc-900"
                                      : "bg-stone-100 text-stone-700 border-stone-200 hover:border-stone-400"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    onChange={(e) =>
                                      toggleModule(
                                        section.key,
                                        moduleName,
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  {checked && <span className="mr-1">✓</span>}
                                  {moduleName}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Selected summary */}
                {totalSelected > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Selected
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {YEAR_SECTIONS.flatMap((s) =>
                        (selectedModulesByYear[s.key] || []).map((m) => (
                          <span
                            key={`sel-${s.key}-${m}`}
                            className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 text-white font-mono"
                          >
                            {m}
                          </span>
                        )),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Placeholder when no module section applies */}
          {!hasItItNumber && !hasLicItNumber && (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-10 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">
                Add your IT Number to select modules
              </p>
              <p className="text-xs text-gray-400 max-w-xs">
                Enter an IT number (e.g. IT20231234) on the left to browse and
                select the modules you are enrolled in.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
