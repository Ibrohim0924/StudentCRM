import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { FiMail } from 'react-icons/fi';
import { api } from '../api/client';
import { Course, CreateInstructorPayload, Instructor } from '../api/types';
import { useApiToast } from '../hooks/useApiToast';

const InstructorForm = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateInstructorPayload) => Promise<void>;
}) => {
  const [form, setForm] = useState<CreateInstructorPayload>({ name: '', email: '', bio: '' });

  useEffect(() => {
    if (!isOpen) {
      setForm({ name: '', email: '', bio: '' });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    try {
      await onSubmit(form);
      onClose();
    } catch (error) {
      // toast already shown
    }
  };

  if (!isOpen) return null;

  return (
    <Card
      shadow="lg"
      borderRadius="xl"
      position="fixed"
      bottom={{ base: 4, md: 8 }}
      right={{ base: 4, md: 8 }}
      maxW="400px"
      w="full"
      zIndex={20}
      bg="white"
      borderWidth="1px"
      borderColor="teal.200"
    >
      <CardHeader>
        <Heading size="md">Yangi o'qituvchi</Heading>
      </CardHeader>
      <Divider />
      <CardBody>
        <Stack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Ism familiya</FormLabel>
            <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Bio</FormLabel>
            <Textarea
              rows={3}
              value={form.bio ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
            />
          </FormControl>
          <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} pt={2}>
            <Button variant="outline" flex={1} onClick={onClose}>
              Bekor qilish
            </Button>
            <Button colorScheme="teal" flex={1} onClick={handleSubmit}>
              Saqlash
            </Button>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
};

const InstructorsPage = () => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const formDisclosure = useDisclosure();
  const { showError, showSuccess } = useApiToast();

  const refresh = async () => {
    try {
      setLoading(true);
      const [instructorsRes, coursesRes] = await Promise.all([api.getInstructors(), api.getCourses()]);
      setInstructors(instructorsRes);
      setCourses(coursesRes);
    } catch (error: any) {
      showError("O'qituvchilarni yuklab bo'lmadi", error.message ?? "Noma'lum xato");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const courseCountByInstructor = useMemo(() => {
    const map: Record<number, number> = {};
    courses.forEach((course) => {
      if (course.instructorId) {
        map[course.instructorId] = (map[course.instructorId] ?? 0) + 1;
      }
    });
    return map;
  }, [courses]);

  const upcomingByInstructor = useMemo(() => {
    const now = new Date();
    const map: Record<number, number> = {};
    courses.forEach((course) => {
      if (course.instructorId && new Date(course.startDate) > now) {
        map[course.instructorId] = (map[course.instructorId] ?? 0) + 1;
      }
    });
    return map;
  }, [courses]);

  const handleSubmit = async (payload: CreateInstructorPayload) => {
    try {
      await api.createInstructor(payload);
      showSuccess("O'qituvchi qo'shildi");
      await refresh();
    } catch (error: any) {
      showError('Saqlashda xato', error.message ?? "Noma'lum xato");
      return Promise.reject(error);
    }
  };

  return (
    <Stack spacing={8} position="relative">
      <Box>
        <Heading size="lg" mb={2}>
          O'qituvchilar ro'yxati
        </Heading>
        <Text color="gray.500">Tajribali murabbiylarni boshqaring va ularning kurslarini kuzating.</Text>
      </Box>

      <Button alignSelf="flex-start" colorScheme="teal" onClick={formDisclosure.onOpen}>
        Yangi o'qituvchi
      </Button>

      {loading ? (
        <Stack align="center" py={16}>
          <Spinner size="lg" />
        </Stack>
      ) : instructors.length === 0 ? (
        <Text color="gray.500">Hozircha o'qituvchi mavjud emas.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
          {instructors.map((instructor) => (
            <Card key={instructor.id} shadow="lg" borderRadius="xl" bg="white">
              <CardHeader>
                <Heading size="md">{instructor.name}</Heading>
                <Text fontSize="sm" color="gray.500">
                  ID: {instructor.id}
                </Text>
              </CardHeader>
              <Divider />
              <CardBody>
                <Stack spacing={3}>
                  <HStack spacing={2} color="gray.600">
                    <Icon as={FiMail} />
                    <Text>{instructor.email}</Text>
                  </HStack>
                  {instructor.bio ? (
                    <Text fontSize="sm" color="gray.600">
                      {instructor.bio}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="gray.400">
                      Bio hali to'ldirilmagan.
                    </Text>
                  )}
                  <Divider />
                  <Stack direction="row" spacing={3}>
                    <Badge colorScheme="teal" px={3} py={1} borderRadius="md">
                      Kurslar: {courseCountByInstructor[instructor.id] ?? 0}
                    </Badge>
                    <Badge colorScheme="purple" px={3} py={1} borderRadius="md">
                      Tez orada: {upcomingByInstructor[instructor.id] ?? 0}
                    </Badge>
                  </Stack>
                  <Text fontSize="xs" color="gray.400">
                    Yaralgan: {new Date(instructor.createdAt).toLocaleDateString('uz-UZ')}
                  </Text>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <InstructorForm isOpen={formDisclosure.isOpen} onClose={formDisclosure.onClose} onSubmit={handleSubmit} />
    </Stack>
  );
};

export default InstructorsPage;