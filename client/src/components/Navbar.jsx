import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const scheduleRef = useRef(null);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target)) {
        setScheduleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scheduleLinks = [
    { to: "/mid-exam-dates", label: "Mid Exam Dates" },
    { to: "/final-exam-dates", label: "Final Exam Dates" },
    { to: "/assignment-dates", label: "Assignment Dates" },
    { to: "/timetable", label: "Timetable" },
  ];

  return (
    <header className="w-full bg-white border-b border-stone-200">
      <nav className="max-w-[85rem] mx-auto flex flex-wrap md:flex-nowrap md:items-center md:justify-between gap-2 py-2 px-4 sm:px-6 lg:px-8">
        {/* Brand + Toggle Row */}
        <div className="flex justify-between items-center w-full md:w-auto">
          <Link className="font-semibold " to="/">
            <img
              src="src\images\logo.png"
              alt="study stream logo"
              className="h-8 w-auto"
            />
          </Link>
          <button
            type="button"
            className="md:hidden size-9 flex justify-center items-center rounded-lg border border-stone-200 text-stone-800 hover:bg-stone-50 focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation"
          >
            {isOpen ? (
              <svg
                className="size-4"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                className="size-4"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" x2="21" y1="6" y2="6" />
                <line x1="3" x2="21" y1="12" y2="12" />
                <line x1="3" x2="21" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Nav Links */}
        <div
          className={`${isOpen ? "flex" : "hidden"} md:flex flex-col md:flex-row md:items-center w-full md:w-auto gap-0.5 md:gap-1 pb-2 md:pb-0`}
        >
          {token ? (
            <>
              {/* Schedule Dropdown */}
              <div className="relative" ref={scheduleRef}>
                <button
                  type="button"
                  onClick={() => setScheduleOpen(!scheduleOpen)}
                  className="w-full md:w-auto p-2 flex items-center gap-1 text-sm text-stone-800 hover:bg-stone-100 rounded-lg focus:outline-none"
                >
                  Schedule
                  <svg
                    className={`size-3.5 transition-transform duration-200 ${scheduleOpen ? "rotate-180" : ""}`}
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {/* Dropdown Panel */}
                {scheduleOpen && (
                  <div className="md:absolute md:top-full md:left-0 mt-1 w-52 bg-white border border-stone-200 rounded-lg shadow-md z-50 py-1">
                    {scheduleLinks.map(({ to, label }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setScheduleOpen(false)}
                        className="block px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {/* End Schedule Dropdown */}

              <Link
                className="p-2 text-sm text-stone-800 hover:bg-stone-100 rounded-lg"
                to="/study-groups"
              >
                Study Groups
              </Link>
              <Link
                className="p-2 text-sm text-stone-800 hover:bg-stone-100 rounded-lg"
                to="/inbox"
              >
                Inbox
              </Link>

              <div className="h-px md:h-4 md:border-s border-stone-200 my-1 md:my-0 md:mx-1"></div>

              <div className="flex items-center gap-x-1.5">
                <Link
                  to="/profile"
                  className="py-[7px] px-2.5 text-sm font-medium rounded-lg border border-stone-200 text-stone-800 hover:bg-stone-50 focus:outline-none"
                >
                  @{user?.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="py-[7px] px-2.5 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 focus:outline-none"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-x-1.5">
              <Link
                className="py-[7px] px-2.5 text-sm font-medium rounded-lg border border-stone-200 text-stone-800 hover:bg-stone-50 focus:outline-none"
                to="/login"
              >
                Sign in
              </Link>
              <Link
                className="py-2 px-2.5 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 focus:outline-none"
                to="/register"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
