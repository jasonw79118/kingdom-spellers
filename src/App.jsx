// Router — protects authenticated routes and wires up the app shell.

import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PlayersPage from "./pages/PlayersPage";
import ListsPage from "./pages/ListsPage";
import ListEditorPage from "./pages/ListEditorPage";
import ScanListPage from "./pages/ScanListPage";


function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="ks-center" style={{ minHeight: "100vh" }}>
        <p className="ks-muted">Loading Kingdom Spellers…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/lists/new" element={<ListEditorPage />} />
            <Route path="/lists/scan" element={<ScanListPage />} />
            <Route path="/lists/:listId" element={<ListEditorPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
