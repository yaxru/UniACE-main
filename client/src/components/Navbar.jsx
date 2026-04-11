import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">UniACE</Link>
      </div>
      <div className="navbar-links">
        {token ? (
          <>
            <Link to="/">Home</Link>
            <Link to="/mid-exam-dates">Mid Exam Dates</Link>
            <Link to="/final-exam-dates">Final Exam Dates</Link>
            <Link to="/assignment-dates">Assignment Dates</Link>
            <Link to="/timetable">Timetable</Link>
            <Link to="/study-groups">Study Groups</Link>
            <Link to="/inbox">Inbox</Link>
            <Link to="/profile">Profile</Link>
            <span className="navbar-username">@{user?.username}</span>
            <button className="btn btn-outline-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
