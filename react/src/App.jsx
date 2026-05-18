import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './i18n/I18nContext';
import { ProtectedRoute, GuestRoute, RoleRoute } from './routes/guards';
import AppLayout from './components/layout/AppLayout';

// Pages chargées uniquement à la demande (code splitting)
const LandingPage        = lazy(() => import('./pages/landing/LandingPage'));
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'));
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/auth/RegisterPage'));
const ResetPasswordPage  = lazy(() => import('./pages/auth/ResetPasswordPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'));
const ProjectsPage             = lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectDetailPage        = lazy(() => import('./pages/projects/ProjectDetailPage'));
const TaskFormPage             = lazy(() => import('./pages/projects/TaskFormPage'));
const MembersPerformancePage   = lazy(() => import('./pages/projects/MembersPerformancePage'));
const TeamsPage          = lazy(() => import('./pages/teams/TeamsPage'));
const TeamDetailPage     = lazy(() => import('./pages/teams/TeamDetailPage'));
const GanttPage          = lazy(() => import('./pages/gantt/GanttPage'));
const TasksHubPage       = lazy(() => import('./pages/tasks/TasksHubPage'));
const CalendarPage       = lazy(() => import('./pages/calendar/CalendarPage'));
const AiPage             = lazy(() => import('./pages/ai/AiPage'));
const NotificationsPage  = lazy(() => import('./pages/notifications/NotificationsPage'));
const SettingsPage       = lazy(() => import('./pages/settings/SettingsPage'));
const UsersAdminPage     = lazy(() => import('./pages/users/UsersAdminPage'));
const AcceptInvitePage   = lazy(() => import('./pages/invites/AcceptInvitePage'));
const AuditLogPage       = lazy(() => import('./pages/audit/AuditLogPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 120_000,   // 2 min — serve from cache when navigating back
      gcTime:   600_000,    // 10 min — keep data in memory between page visits
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
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
          <Routes>
            {/* Landing */}
            <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />

            {/* Guest routes */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Invitation (connecté ou non) */}
            <Route path="/accept-invite" element={<AcceptInvitePage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/projects/:id/tasks/new" element={<TaskFormPage />} />
              <Route path="/projects/:id/tasks/:taskId/edit" element={<TaskFormPage />} />
              <Route path="/projects/:id/members-performance" element={<MembersPerformancePage />} />
              <Route path="/tasks" element={<TasksHubPage />} />
              <Route path="/calendar" element={<RoleRoute allow={['admin', 'member']}><CalendarPage /></RoleRoute>} />
              <Route path="/teams" element={<RoleRoute allow={['admin']}><TeamsPage /></RoleRoute>} />
              <Route path="/teams/:id" element={<RoleRoute allow={['admin']}><TeamDetailPage /></RoleRoute>} />
              <Route path="/users" element={<RoleRoute allow={['admin']}><UsersAdminPage /></RoleRoute>} />
              <Route path="/gantt" element={<RoleRoute allow={['admin', 'member']}><GanttPage /></RoleRoute>} />
              <Route path="/ai" element={<RoleRoute allow={['admin', 'member']}><AiPage /></RoleRoute>} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/audit-log" element={<RoleRoute allow={['admin', 'member']}><AuditLogPage /></RoleRoute>} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
          </I18nProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
