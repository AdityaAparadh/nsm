import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/admin/AdminDashboard';
import WorkshopDetail from './pages/admin/WorkshopDetail';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import ParticipantDashboard from './pages/participant/ParticipantDashboard';

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  if (user.roles.includes('ADMIN')) {
    return <Navigate to="/admin" replace />;
  } else if (user.roles.includes('INSTRUCTOR')) {
    return <Navigate to="/instructor" replace />;
  } else {
    return <Navigate to="/participant" replace />;
  }
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/workshop/:workshopId"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <WorkshopDetail />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/instructor/*"
            element={
              <ProtectedRoute requiredRole="INSTRUCTOR">
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/participant/*"
            element={
              <ProtectedRoute requiredRole="PARTICIPANT">
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
