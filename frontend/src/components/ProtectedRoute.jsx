import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ProtectedRoute = ({ children }) => {
  const { user, token, initializing } = useAuthStore();

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse text-xl tracking-[0.3em] uppercase">
          Loading...
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

export default ProtectedRoute;

