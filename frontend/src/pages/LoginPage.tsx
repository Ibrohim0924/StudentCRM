import {
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApiToast } from '../hooks/useApiToast';

const LoginPage = () => {
  const { user, signIn, loading } = useAuth();
  const { showError, showSuccess } = useApiToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email || !password) {
      showError("Ma'lumot yetarli emas", 'Email va parolni kiriting');
      return;
    }

    setSubmitting(true);
    try {
      await signIn({ email, password });
      showSuccess('Xush kelibsiz!', 'Tizimga muvaffaqiyatli kirdingiz');
      navigate('/', { replace: true });
    } catch (error: any) {
      const message =
        error?.message ??
        error?.response?.data?.message ??
        'Kirishda xatolik yuz berdi';
      showError('Kirish amalga oshmadi', Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  }, [email, password, navigate, showError, showSuccess, signIn]);

  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Card w="full" maxW="420px" shadow="lg" borderRadius="xl">
        <CardBody>
          <Stack spacing={6}>
            <Stack spacing={1} textAlign="center">
              <Heading size="lg" color="teal.500">
                Students CRM
              </Heading>
              <Text color="gray.600">Administrator sifatida tizimga kiring</Text>
            </Stack>

            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Parol</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </FormControl>
            </Stack>

            <Button
              colorScheme="teal"
              onClick={handleSubmit}
              isLoading={submitting}
              loadingText="Kirilmoqda..."
            >
              Kirish
            </Button>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default LoginPage;
