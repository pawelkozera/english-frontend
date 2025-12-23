import { Route, Routes } from "react-router-dom";
import AuthRedirector from "./components/AuthRedirector";
import RequireAuth from "./components/RequireAuth";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import GroupsPage from "./pages/GroupsPage";
import JoinInvitePage from "./pages/JoinInvitePage";

export default function App() {
  return (
    <>
      <AuthRedirector />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join" element={<JoinInvitePage />} />
        <Route
          path="/groups"
          element={
            <RequireAuth>
              <GroupsPage />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
}
