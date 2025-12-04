import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
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

  if (requiredRole && !user.roles.includes(requiredRole)) {
    // Redirect to appropriate dashboard based on user's role
    if (user.roles.includes('ADMIN')) {
      return <Navigate to="/admin" replace />;
    } else if (user.roles.includes('INSTRUCTOR')) {
      return <Navigate to="/instructor" replace />;
    } else {
      return <Navigate to="/participant" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

