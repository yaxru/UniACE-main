import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Home from "./pages/Home";
import QuestionDetail from "./pages/QuestionDetail";
import Profile from "./pages/Profile";
import Inbox from "./pages/Inbox";
import ModulesPage from "./pages/ModulesPage";
import ModuleUploadPage from "./pages/ModuleUploadPage";
import ExamDatesPage from "./pages/ExamDatesPage";
import AssignmentDatesPage from "./pages/AssignmentDatesPage";
import MidExamDatesPage from "./pages/MidExamDatesPage";
import FinalExamDatesPage from "./pages/FinalExamDatesPage";
import TimetablePage from "./pages/TimetablePage";
import Onboarding from "./pages/Onboarding";
import StudyGroupsPage from "./pages/StudyGroupsPage";
function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { token } = useAuth();
  return !token ? children : <Navigate to="/" replace />;
}

const NO_NAVBAR_ROUTES = ["/login", "/register", "/onboarding"];
const NO_CONTAINER_ROUTES = [
  "/",
  "/login",
  "/register",
  "/onboarding",
  "/study-groups",
];

function AppLayout() {
  const location = useLocation();
  const noNavbar = NO_NAVBAR_ROUTES.includes(location.pathname);
  const noContainer = NO_CONTAINER_ROUTES.includes(location.pathname);
  return (
    <>
      {!noNavbar && <Navbar />}
      <main className={noContainer ? undefined : "container"}>
        <Routes>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/questions/:id"
            element={
              <PrivateRoute>
                <QuestionDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/modules"
            element={
              <PrivateRoute>
                <ModulesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/modules/upload"
            element={
              <PrivateRoute>
                <ModuleUploadPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/exam-dates"
            element={
              <PrivateRoute>
                <ExamDatesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/mid-exam-dates"
            element={
              <PrivateRoute>
                <MidExamDatesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/final-exam-dates"
            element={
              <PrivateRoute>
                <FinalExamDatesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/assignment-dates"
            element={
              <PrivateRoute>
                <AssignmentDatesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <PrivateRoute>
                <TimetablePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <PrivateRoute>
                <Inbox />
              </PrivateRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <PrivateRoute>
                <Onboarding />
              </PrivateRoute>
            }
          />
          <Route
            path="/study-groups"
            element={
              <PrivateRoute>
                <StudyGroupsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
