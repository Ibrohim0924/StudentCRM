import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  Heading,
  Progress,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiRefreshCw } from 'react-icons/fi';
import { api } from '../api/client';
import { Course, Enrollment, Student } from '../api/types';
import { useApiToast } from '../hooks/useApiToast';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showError } = useApiToast();
  const showErrorRef = useRef(showError);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const [coursesData, studentsData, activeEnrollments] = await Promise.all([
        api.getCourses(),
        api.getStudents(),
        api.getActiveEnrollments(),
      ]);
      setCourses(coursesData);
      setStudents(studentsData);
      setEnrollments(activeEnrollments);
    } catch (error: any) {
      showErrorRef.current?.("Ma'lumotlarni yuklab bo'lmadi", error?.message ?? "Noma'lum xato");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadDashboard();
  }, [loadDashboard]);

  const statCards = useMemo(
    () => [
      { label: 'Jami kurslar', value: courses.length, route: '/courses' },
      { label: 'Talabalar', value: students.length, route: '/students' },
      { label: "Faol ro'yxatlar", value: enrollments.length, route: '/enrollments' },
    ],
    [courses.length, students.length, enrollments.length],
  );

  const capacitySummary = useMemo(() => {
    const totals = courses.reduce(
      (acc, course) => {
        const used = course.capacity - course.seatsAvailable;
        acc.totalSeats += course.capacity;
        acc.usedSeats += used;
        return acc;
      },
      { totalSeats: 0, usedSeats: 0 },
    );

    const usagePercent = totals.totalSeats === 0 ? 0 : Math.round((totals.usedSeats / totals.totalSeats) * 100);

    return {
      usagePercent,
      usedSeats: totals.usedSeats,
      availableSeats: Math.max(totals.totalSeats - totals.usedSeats, 0),
      totalSeats: totals.totalSeats,
    };
  }, [courses]);

  const upcomingCourses = useMemo(() => {
    const now = Date.now();
    return courses
      .filter((course) => new Date(course.startDate).getTime() > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 4);
  }, [courses]);

  const ongoingCourses = useMemo(() => {
    const now = Date.now();
    return courses.filter((course) => {
      const start = new Date(course.startDate).getTime();
      const end = new Date(course.endDate).getTime();
      return start <= now && end >= now;
    });
  }, [courses]);

  const recentEnrollments = useMemo(
    () =>
      [...enrollments]
        .sort((a, b) => new Date(b.enrolledDate).getTime() - new Date(a.enrolledDate).getTime())
        .slice(0, 5),
    [enrollments],
  );

  const recentStudents = useMemo(
    () =>
      [...students]
        .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())
        .slice(0, 5),
    [students],
  );

  if (loading) {
    return (
      <Flex align="center" justify="center" minH="50vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Stack spacing={8}>
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={4}>
        <Box>
          <Heading size="lg">Asosiy</Heading>
          <Text color="gray.500">Platforma ko'rsatkichlari va tezkor ma'lumotlar</Text>
        </Box>
        <Button leftIcon={<FiRefreshCw />} colorScheme="teal" variant="solid" onClick={() => void loadDashboard()} isLoading={refreshing}>
          Yangilash
        </Button>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            shadow="sm"
            borderRadius="lg"
            bg="white"
            cursor="pointer"
            role="button"
            tabIndex={0}
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
            transition="all 0.2s ease"
            onClick={() => navigate(stat.route)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(stat.route);
              }
            }}
          >
            <CardBody>
              <Stat>
                <StatLabel color="gray.500">{stat.label}</StatLabel>
                <StatNumber>{stat.value}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <Card shadow="sm" borderRadius="lg">
        <CardBody>
          <Heading size="md" mb={3}>
            Joylar bandligi
          </Heading>
          <Text color="gray.500" mb={4}>
            Jami {capacitySummary.totalSeats} joydan {capacitySummary.usedSeats} tasi band, {capacitySummary.availableSeats} tasi bo'sh.
          </Text>
          <Progress value={capacitySummary.usagePercent} size="sm" colorScheme="teal" borderRadius="full" hasStripe isAnimated={capacitySummary.usagePercent > 0} />
          <Text mt={2} fontSize="sm" color="gray.500">
            Bandlik: {capacitySummary.usagePercent}%
          </Text>
        </CardBody>
      </Card>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
        <Card shadow="sm" borderRadius="lg">
          <CardHeader>
            <Heading size="md">Tez orada boshlanadigan kurslar</Heading>
          </CardHeader>
          <Divider />
          <CardBody>
            {upcomingCourses.length === 0 ? (
              <Text color="gray.500">Hozircha yangi kurs rejalashtirilmagan.</Text>
            ) : (
              <Stack spacing={3}>
                {upcomingCourses.map((course) => (
                  <Box key={course.id} borderLeft="4px solid" borderColor="teal.400" pl={3} py={1}>
                    <Heading size="sm">{course.title}</Heading>
                    <Text fontSize="sm" color="gray.500">
                      {new Date(course.startDate).toLocaleString('uz-UZ', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Box>
                ))}
              </Stack>
            )}
          </CardBody>
        </Card>

        <Card shadow="sm" borderRadius="lg">
          <CardHeader>
            <Heading size="md">So'ngi ro'yxatlar</Heading>
          </CardHeader>
          <Divider />
          <CardBody>
            {recentEnrollments.length === 0 ? (
              <Text color="gray.500">Faol ro'yxat mavjud emas.</Text>
            ) : (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Talaba</Th>
                    <Th>Kurs</Th>
                    <Th>Yozilgan sana</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recentEnrollments.map((enrollment) => (
                    <Tr key={enrollment.id}>
                      <Td>{enrollment.student?.name ?? "Noma'lum"}</Td>
                      <Td>{enrollment.course?.title ?? "Noma'lum"}</Td>
                      <Td>
                        {new Date(enrollment.enrolledDate).toLocaleDateString('uz-UZ', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card shadow="sm" borderRadius="lg">
        <CardHeader>
          <Heading size="md">Hozir davom etayotgan kurslar</Heading>
        </CardHeader>
        <Divider />
        <CardBody>
          {ongoingCourses.length === 0 ? (
            <Text color="gray.500">Davom etayotgan kurs mavjud emas.</Text>
          ) : (
            <Table variant="striped" colorScheme="teal" size="md">
              <Thead>
                <Tr>
                  <Th>Kurs</Th>
                  <Th>Instruktor</Th>
                  <Th>Band joylar</Th>
                  <Th>Boshlanish</Th>
                  <Th>Tugash</Th>
                </Tr>
              </Thead>
              <Tbody>
                {ongoingCourses.map((course) => (
                  <Tr key={course.id}>
                    <Td>
                      <Stack spacing={0}>
                        <Text fontWeight="semibold">{course.title}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {course.description}
                        </Text>
                      </Stack>
                    </Td>
                    <Td>{course.instructor?.name ?? 'Biriktirilmagan'}</Td>
                    <Td>
                      <Badge colorScheme="teal">
                        {course.capacity - course.seatsAvailable}/{course.capacity}
                      </Badge>
                    </Td>
                    <Td>{new Date(course.startDate).toLocaleDateString('uz-UZ')}</Td>
                    <Td>{new Date(course.endDate).toLocaleDateString('uz-UZ')}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card shadow="sm" borderRadius="lg">
        <CardHeader>
          <Heading size="md">Yaqinda qo'shilgan talabalar</Heading>
        </CardHeader>
        <Divider />
        <CardBody>
          {recentStudents.length === 0 ? (
            <Text color="gray.500">Talabalar ro'yxati bo'sh.</Text>
          ) : (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Talaba</Th>
                  <Th>Email</Th>
                  <Th>Ro'yxatdan o'tgan sana</Th>
                </Tr>
              </Thead>
              <Tbody>
                {recentStudents.map((student) => (
                  <Tr key={student.id}>
                    <Td>{student.name}</Td>
                    <Td>{student.email}</Td>
                    <Td>{new Date(student.enrolledAt).toLocaleDateString('uz-UZ')}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </Stack>
  );
};

export default DashboardPage;
