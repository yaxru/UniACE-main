import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

// Vertical Stepper Sidebar
function StepperSidebar({ step, labels, descriptions }) {
  return (
    <div className="flex flex-col gap-0">
      {labels.map((label, i) => (
        <div key={i} className="flex gap-4">
          {/* Line + Circle column */}
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 shrink-0 transition-all duration-300
                ${
                  i < step
                    ? "bg-white border-white text-green-600"
                    : i === step
                      ? "bg-white border-white text-green-600"
                      : "bg-green-500 border-green-400 text-green-200"
                }`}
            >
              {i < step ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < labels.length - 1 && (
              <div
                className={`w-0.5 flex-1 my-1 min-h-8 transition-all duration-300 ${i < step ? "bg-white" : "bg-green-400"}`}
              />
            )}
          </div>
          {/* Text column */}
          <div className="pb-8">
            <p
              className={`text-sm font-semibold leading-8 ${
                i < step
                  ? "text-green-200"
                  : i === step
                    ? "text-white"
                    : "text-green-300"
              }`}
            >
              {label}
            </p>
            <p
              className={`text-xs leading-none ${
                i === step ? "text-green-100" : "text-green-300"
              }`}
            >
              {descriptions[i]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Personal Info
function StepPersonal({ form, onChange }) {
  return (
    <div>
      <h2 className="text-3xl text-gray-900 font-medium  ">Personal Info</h2>
      <p className="text-sm text-gray-500/90 mt-3  ">Tell us about yourself</p>

      <div className="flex items-center w-full bg-transparent border border-gray-300/60 h-12 rounded-full overflow-hidden pl-6 gap-2 mt-8">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <input
          name="name"
          value={form.name}
          onChange={onChange}
          placeholder="Full Name e.g. Kavindu Perera"
          className="bg-transparent text-gray-500/80 placeholder-gray-500/80 outline-none text-sm w-full h-full pr-4"
        />
      </div>

      <div className="flex items-center w-full bg-transparent border border-gray-300/60 h-12 rounded-full overflow-hidden pl-6 gap-2 mt-4">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="16" y1="10" x2="19" y2="10" />
          <line x1="16" y1="14" x2="19" y2="14" />
          <circle cx="8" cy="12" r="2" />
        </svg>
        <input
          name="itNumber"
          value={form.itNumber}
          onChange={onChange}
          placeholder="Student / IT Number e.g. IT21234567"
          className="bg-transparent text-gray-500/80 placeholder-gray-500/80 outline-none text-sm w-full h-full pr-4"
        />
      </div>

      <div className="flex items-center w-full bg-transparent border border-gray-300/60 h-12 rounded-full overflow-hidden pl-6 gap-2 mt-4">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <select
          name="faculty"
          value={form.faculty}
          onChange={onChange}
          className="bg-transparent text-gray-500/80 outline-none text-sm w-full h-full pr-4 cursor-pointer appearance-none"
        >
          <option value="">Faculty</option>
          <option>IT</option>
          <option>Business</option>
          <option>Engineering</option>
          <option>Science</option>
        </select>
      </div>

      <div className="flex items-center w-full bg-transparent border border-gray-300/60 h-12 rounded-full overflow-hidden pl-6 gap-2 mt-4">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <select
          name="year"
          value={form.year}
          onChange={onChange}
          className="bg-transparent text-gray-500/80 outline-none text-sm w-full h-full pr-4 cursor-pointer appearance-none"
        >
          <option value="">Year of Study</option>
          <option>Year 1</option>
          <option>Year 2</option>
          <option>Year 3</option>
          <option>Year 4</option>
        </select>
      </div>
    </div>
  );
}

// Academic Details
function StepAcademic({ form, onChange }) {
  return (
    <div>
      <h2 className="text-3xl text-gray-900 font-medium  ">Academic Details</h2>
      <p className="text-sm text-gray-500/90 mt-3  ">
        Your batch and current modules
      </p>

      <p className="text-xs text-gray-400 mt-8 mb-2">Batch Type</p>
      <div className="flex gap-2 flex-wrap">
        {["Weekday", "Weekend"].map((opt) => (
          <label
            key={opt}
            className={`px-5 py-2 rounded-full text-sm border cursor-pointer select-none transition-all ${
              form.batch === opt
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-transparent text-gray-500/80 border-gray-300/60 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="batch"
              value={opt}
              checked={form.batch === opt}
              onChange={onChange}
              className="hidden"
            />
            {opt}
          </label>
        ))}
      </div>

      <div className="w-full border border-gray-300/60 rounded-2xl overflow-hidden mt-6">
        <textarea
          name="modules"
          value={form.modules}
          onChange={onChange}
          placeholder="Current Modules e.g. SE3040, SE3050, IT3060"
          className="w-full bg-transparent text-gray-500/80 placeholder-gray-500/80 outline-none text-sm h-24 resize-none px-6 py-3"
        />
      </div>
      <p className="text-xs text-gray-400 mt-1 pl-2">
        Separate module codes with commas
      </p>
    </div>
  );
}

// Location & Availability
function StepLocation({ form, onChange }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <h2 className="text-3xl text-gray-900 font-medium  ">
        Location & Availability
      </h2>
      <p className="text-sm text-gray-500/90 mt-3  ">
        Where you are and when you're free
      </p>

      <div className="flex items-center w-full bg-transparent border border-gray-300/60 h-12 rounded-full overflow-hidden pl-6 gap-2 mt-8">
        <svg
          width="14"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          name="location"
          value={form.location}
          onChange={onChange}
          placeholder="Where you live e.g. Malabe, Colombo 3"
          className="bg-transparent text-gray-500/80 placeholder-gray-500/80 outline-none text-sm w-full h-full pr-4"
        />
      </div>

      <p className="text-xs text-gray-400 mt-5 mb-2">Campus Status</p>
      <div className="flex gap-2 flex-wrap">
        {["On Campus", "Off Campus"].map((opt) => (
          <label
            key={opt}
            className={`px-5 py-2 rounded-full text-sm border cursor-pointer select-none transition-all ${
              form.onCampus === opt
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-transparent text-gray-500/80 border-gray-300/60 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="onCampus"
              value={opt}
              checked={form.onCampus === opt}
              onChange={onChange}
              className="hidden"
            />
            {opt}
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-5 mb-2">Available Days</p>
      <div className="flex flex-wrap gap-2">
        {days.map((day) => (
          <label
            key={day}
            className={`px-3 py-1.5 rounded-full text-sm border cursor-pointer select-none transition-all ${
              form.availability.includes(day)
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-transparent text-gray-500/80 border-gray-300/60 hover:border-gray-400"
            }`}
          >
            <input
              type="checkbox"
              name="availability"
              value={day}
              checked={form.availability.includes(day)}
              onChange={onChange}
              className="hidden"
            />
            {day}
          </label>
        ))}
      </div>
    </div>
  );
}

// Study Preferences
function StepStudy({ form, onChange }) {
  return (
    <div>
      <h2 className="text-3xl text-gray-900 font-medium  ">
        Study Preferences
      </h2>
      <p className="text-sm text-gray-500/90 mt-3  ">How you like to learn</p>

      <p className="text-xs text-gray-400 mt-8 mb-2">Preferred Study Method</p>
      <div className="flex gap-2 flex-wrap">
        {["Online", "In-person", "Both"].map((opt) => (
          <label
            key={opt}
            className={`px-5 py-2 rounded-full text-sm border cursor-pointer select-none transition-all ${
              form.studyMethod === opt
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-transparent text-gray-500/80 border-gray-300/60 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="studyMethod"
              value={opt}
              checked={form.studyMethod === opt}
              onChange={onChange}
              className="hidden"
            />
            {opt}
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-5 mb-2">Study Style</p>
      <div className="flex gap-2 flex-wrap">
        {["Solo", "Group", "Mixed"].map((opt) => (
          <label
            key={opt}
            className={`px-5 py-2 rounded-full text-sm border cursor-pointer select-none transition-all ${
              form.studyStyle === opt
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-transparent text-gray-500/80 border-gray-300/60 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="studyStyle"
              value={opt}
              checked={form.studyStyle === opt}
              onChange={onChange}
              className="hidden"
            />
            {opt}
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-5 mb-2">
        Study Goals <span className="text-gray-300">(pick all that apply)</span>
      </p>
      <div className="flex gap-2 flex-wrap">
        {["Exam Prep", "Assignments", "General Learning"].map((opt) => (
          <label
            key={opt}
            className={`px-5 py-2 rounded-full text-sm border cursor-pointer select-none transition-all ${
              form.studyGoals.includes(opt)
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-transparent text-gray-500/80 border-gray-300/60 hover:border-gray-400"
            }`}
          >
            <input
              type="checkbox"
              name="studyGoals"
              value={opt}
              checked={form.studyGoals.includes(opt)}
              onChange={onChange}
              className="hidden"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

// Main
const STEP_LABELS = ["Personal", "Academic", "Location", "Preferences"];
const STEP_DESCRIPTIONS = [
  "Tell us about yourself",
  "Your batch and modules",
  "Where you are and when you're free",
  "How you like to learn",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    itNumber: "",
    faculty: "",
    year: "",
    batch: "",
    modules: "",
    location: "",
    onCampus: "",
    availability: [],
    studyMethod: "",
    studyStyle: "",
    studyGoals: [],
  });

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        [name]: checked
          ? [...prev[name], value]
          : prev[name].filter((v) => v !== value),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  function validate(currentStep) {
    if (currentStep === 0) {
      if (!form.name.trim()) return "Full name is required.";
      if (form.itNumber.trim() && !/^(IT|LIC)\d+$/i.test(form.itNumber.trim()))
        return "IT Number must start with IT or LIC followed by digits (e.g. IT21234567).";
      if (!form.faculty) return "Please select your faculty.";
      if (!form.year) return "Please select your year of study.";
    }
    if (currentStep === 1) {
      if (!form.batch)
        return "Please select your batch type (Weekday or Weekend).";
    }
    if (currentStep === 2) {
      if (!form.onCampus) return "Please select your campus status.";
      if (form.availability.length === 0)
        return "Please select at least one available day.";
    }
    if (currentStep === 3) {
      if (!form.studyMethod) return "Please select a preferred study method.";
      if (!form.studyStyle) return "Please select a study style.";
      if (form.studyGoals.length === 0)
        return "Please select at least one study goal.";
    }
    return "";
  }

  function next() {
    const err = validate(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  function prev() {
    setError("");
    setStep((s) => s - 1);
  }

  async function handleFinish() {
    const err = validate(step);
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.put("/onboarding", form);
      updateUser(res.data.user);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tw-page flex h-screen w-full">
      {/* Left: vertical stepper */}
      <div className="hidden md:flex w-100 shrink-0 bg-green-600 border-r border-green-700 flex-col justify-center px-12">
        <h2 className="text-4xl text-white font-medium mb-2">Welcome</h2>
        <p className="text-base text-green-200 mb-10">Set up your profile</p>
        <StepperSidebar
          step={step}
          labels={STEP_LABELS}
          descriptions={STEP_DESCRIPTIONS}
        />
      </div>

      {/* Right: form */}
      <div className="w-full flex flex-col items-center justify-center overflow-y-auto py-10">
        <div className="w-80 md:w-96 flex flex-col">
          {/* Mobile step indicator */}
          <p className="md:hidden text-xs text-gray-400 mb-6">
            Step {step + 1} of {STEP_LABELS.length} —{" "}
            <span className="font-medium text-gray-600">
              {STEP_LABELS[step]}
            </span>
          </p>

          <div>
            {step === 0 && <StepPersonal form={form} onChange={handleChange} />}
            {step === 1 && <StepAcademic form={form} onChange={handleChange} />}
            {step === 2 && <StepLocation form={form} onChange={handleChange} />}
            {step === 3 && <StepStudy form={form} onChange={handleChange} />}
          </div>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
            <div>
              {step > 0 && (
                <button
                  onClick={prev}
                  className="px-5 py-2 rounded-full border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-opacity"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {step + 1} of {STEP_LABELS.length}
              </span>
              {step < STEP_LABELS.length - 1 ? (
                <button
                  onClick={next}
                  className="px-6 py-2 rounded-full bg-zinc-900 text-white text-sm hover:opacity-90 transition-opacity"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="px-6 py-2 rounded-full bg-zinc-900 text-white text-sm hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
                >
                  {loading ? "Saving..." : "Finish"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
