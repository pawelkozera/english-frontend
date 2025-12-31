import { Navigate, Route, Routes } from "react-router-dom";
import AuthRedirector from "./components/AuthRedirector";
import RequireAuth from "./components/RequireAuth";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainPage from "./pages/MainPage";
import JoinInvitePage from "./pages/JoinInvitePage";
import LessonTasksPage from "./pages/LessonTasksPage";
import LessonTaskSolvePage from "./pages/LessonTaskSolvePage";

export default function App() {
  return (
    <>
      <AuthRedirector />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join" element={<JoinInvitePage />} />
        <Route path="/groups" element={<Navigate to="/app" replace />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <MainPage />
            </RequireAuth>
          }
        />
        <Route
          path="/app/lessons/:assignmentId"
          element={
            <RequireAuth>
              <LessonTasksPage />
            </RequireAuth>
          }
        />
        <Route
          path="/app/lessons/:assignmentId/tasks/:taskId"
          element={
            <RequireAuth>
              <LessonTaskSolvePage />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
}
