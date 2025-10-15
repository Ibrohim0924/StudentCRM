import { Navigate, Outlet } from 'react-router-dom';
import { Spinner, Stack } from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Stack minH="100vh" align="center" justify="center">
        <Spinner size="lg" color="teal.500" />
      </Stack>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
