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
  Input,
  Select,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import {
  Course,
  EnrollPayload,
  Enrollment,
  EnrollmentActionPayload,
  Student,
} from '../api/types';
import { useApiToast } from '../hooks/useApiToast';

const EnrollmentForm = ({
  isOpen,
  onClose,
  onSubmit,
  courses,
  students,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: EnrollPayload) => Promise<void>;
  courses: Course[];
  students: Student[];
}) => {
  const [form, setForm] = useState<EnrollPayload>({ studentId: 0, courseId: 0 });

  useEffect(() => {
    if (!isOpen) {
      setForm({ studentId: 0, courseId: 0 });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!form.studentId || !form.courseId) return;
    try {
      await onSubmit(form);
      onClose();
    } catch (error) {
      // toasts already shown
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
      maxW="420px"
      w="full"
      zIndex={20}
      bg="white"
      borderWidth="1px"
      borderColor="teal.200"
    >
      <CardHeader>
        <Heading size="md">Talabani kursga yozish</Heading>
      </CardHeader>
      <Divider />
      <CardBody>
        <Stack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Talaba</FormLabel>
            <Select
              placeholder="Talabani tanlang"
              value={form.studentId || ''}
              onChange={(event) => setForm((prev) => ({ ...prev, studentId: Number(event.target.value) }))}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.email})
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Kurs</FormLabel>
            <Select
              placeholder="Kursni tanlang"
              value={form.courseId || ''}
              onChange={(event) => setForm((prev) => ({ ...prev, courseId: Number(event.target.value) }))}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} (Mavjud joylar: {course.seatsAvailable})
                </option>
              ))}
            </Select>
          </FormControl>
          <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} pt={2}>
            <Button variant="outline" flex={1} onClick={onClose}>
              Bekor qilish
            </Button>
            <Button colorScheme="teal" flex={1} onClick={handleSubmit}>
              Yozish
            </Button>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
};

const EnrollmentsPage = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const formDisclosure = useDisclosure();
  const { showError, showSuccess } = useApiToast();

  const refresh = async () => {
    try {
      setLoading(true);
      const [enrollmentsRes, coursesRes, studentsRes] = await Promise.all([
        api.getActiveEnrollments(),
        api.getCourses(),
        api.getStudents(),
      ]);
      setEnrollments(enrollmentsRes);
      const now = new Date();
      setCourses(
        coursesRes.filter(
          (course) =>
            course.seatsAvailable > 0 && new Date(course.endDate).getTime() > now.getTime(),
        ),
      );
      setStudents(studentsRes);
    } catch (error: any) {
      showError("Ma'lumotlarni yuklab bo'lmadi", error.message ?? "Noma'lum xato");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleEnroll = async (payload: EnrollPayload) => {
    try {
      await api.enrollStudent(payload);
      showSuccess('Talaba kursga yozildi');
      await refresh();
    } catch (error: any) {
      showError("Ro'yxatga yozishda xato", error.message ?? "Noma'lum xato");
      return Promise.reject(error);
    }
  };

  const handleComplete = async (enrollment: Enrollment) => {
    try {
      const payload: EnrollmentActionPayload = { enrollmentId: enrollment.id };
      await api.completeEnrollment(payload);
      showSuccess('Kurs yakunlandi');
      await refresh();
    } catch (error: any) {
      showError("Amalni bajarib bo'lmadi", error.message ?? "Noma'lum xato");
    }
  };

  const handleCancel = async (enrollment: Enrollment) => {
    try {
      const payload: EnrollmentActionPayload = { enrollmentId: enrollment.id };
      await api.cancelEnrollment(payload);
      showSuccess("Ro'yxat bekor qilindi");
      await refresh();
    } catch (error: any) {
      showError("Bekor qilishda xato", error.message ?? "Noma'lum xato");
    }
  };

  const groupedByCourse = useMemo(() => {
    const map: Record<number, number> = {};
    enrollments.forEach((enroll) => {
      map[enroll.courseId] = (map[enroll.courseId] ?? 0) + 1;
    });
    return map;
  }, [enrollments]);

  return (
    <Stack spacing={8} position="relative">
      <Box>
        <Heading size="lg" mb={2}>
          Ro'yxatlar boshqaruvi
        </Heading>
        <Text color="gray.500">
          Talabalarni kurslarga yozish, yakunlash va bekor qilishni boshqaring.
        </Text>
      </Box>

      <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="center">
        <Badge colorScheme="teal" px={4} py={2} borderRadius="lg" fontSize="md">
          Faol ro'yxatlar: {enrollments.length}
        </Badge>
        <Badge colorScheme="purple" px={4} py={2} borderRadius="lg" fontSize="md">
          Mavjud kurslar: {courses.length}
        </Badge>
        <Button colorScheme="teal" onClick={formDisclosure.onOpen} ml={{ base: 0, md: 'auto' }}>
          Talaba yozish
        </Button>
      </Stack>

      <Card shadow="lg" borderRadius="xl">
        <CardHeader>
          <Heading size="md">Faol ro'yxatlar</Heading>
        </CardHeader>
        <Divider />
        <CardBody>
          {loading ? (
            <Stack align="center" py={16}>
              <Spinner size="lg" />
            </Stack>
          ) : enrollments.length === 0 ? (
            <Text color="gray.500">Hozircha faol ro'yxatlar mavjud emas.</Text>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="md">
                <Thead>
                  <Tr>
                    <Th>Talaba</Th>
                    <Th>Kurs</Th>
                    <Th>Yozilgan sana</Th>
                    <Th>Holat</Th>
                    <Th textAlign="right">Amallar</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {enrollments.map((enroll) => (
                    <Tr key={enroll.id}>
                      <Td>
                        <Stack spacing={1}>
                          <Text fontWeight="semibold">{enroll.student?.name ?? "Noma'lum"}</Text>
                          <Text fontSize="xs" color="gray.500">
                            {enroll.student?.email}
                          </Text>
                        </Stack>
                      </Td>
                      <Td>
                        <Stack spacing={1}>
                          <Text fontWeight="semibold">{enroll.course?.title ?? "Noma'lum kurs"}</Text>
                          <Text fontSize="xs" color="gray.500">
                            Ro'yxatlar soni: {groupedByCourse[enroll.courseId] ?? 0}
                          </Text>
                        </Stack>
                      </Td>
                      <Td>{new Date(enroll.enrolledDate).toLocaleString('uz-UZ')}</Td>
                      <Td>
                        <Badge colorScheme={enroll.completed ? 'green' : enroll.canceledAt ? 'red' : 'teal'}>
                          {enroll.completed ? 'Yakunlangan' : enroll.canceledAt ? 'Bekor' : 'Faol'}
                        </Badge>
                      </Td>
                      <Td textAlign="right">
                        <Stack direction="row" spacing={2} justify="flex-end">
                          <Button size="sm" variant="outline" onClick={() => handleCancel(enroll)}>
                            Bekor qilish
                          </Button>
                          <Button
                            size="sm"
                            colorScheme="teal"
                            variant={enroll.completed ? 'outline' : 'solid'}
                            onClick={() => handleComplete(enroll)}
                            isDisabled={enroll.completed}
                          >
                            Yakunlash
                          </Button>
                        </Stack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>

      <EnrollmentForm
        isOpen={formDisclosure.isOpen}
        onClose={formDisclosure.onClose}
        onSubmit={handleEnroll}
        courses={courses}
        students={students}
      />
    </Stack>
  );
};

export default EnrollmentsPage;