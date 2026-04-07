import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './i18n/I18nContext';
import { ProtectedRoute, GuestRoute, RoleRoute } from './routes/guards';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/landing/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import TeamsPage from './pages/teams/TeamsPage';
import TeamDetailPage from './pages/teams/TeamDetailPage';
import GanttPage from './pages/gantt/GanttPage';
import TasksHubPage from './pages/tasks/TasksHubPage';
import CalendarPage from './pages/calendar/CalendarPage';
import AiPage from './pages/ai/AiPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SettingsPage from './pages/settings/SettingsPage';
import UsersAdminPage from './pages/users/UsersAdminPage';
import AcceptInvitePage from './pages/invites/AcceptInvitePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors closeButton duration={4000} />
      <BrowserRouter>
        <AuthProvider>
          <I18nProvider>
          <Routes>
            {/* Landing */}
            <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />

            {/* Guest routes */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Invitation (connecté ou non) */}
            <Route path="/accept-invite" element={<AcceptInvitePage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/tasks" element={<TasksHubPage />} />
              <Route path="/calendar" element={<RoleRoute allow={['admin', 'member']}><CalendarPage /></RoleRoute>} />
              <Route path="/teams" element={<RoleRoute allow={['admin']}><TeamsPage /></RoleRoute>} />
              <Route path="/teams/:id" element={<RoleRoute allow={['admin']}><TeamDetailPage /></RoleRoute>} />
              <Route path="/users" element={<RoleRoute allow={['admin']}><UsersAdminPage /></RoleRoute>} />
              <Route path="/gantt" element={<RoleRoute allow={['admin', 'member']}><GanttPage /></RoleRoute>} />
              <Route path="/ai" element={<RoleRoute allow={['admin', 'member']}><AiPage /></RoleRoute>} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </I18nProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
