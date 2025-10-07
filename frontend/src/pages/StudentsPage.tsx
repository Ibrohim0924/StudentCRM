import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  Heading,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useDisclosure,
  Portal,
} from '@chakra-ui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiEdit2, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { api } from '../api/client';
import { CreateStudentPayload, Enrollment, Student } from '../api/types';
import { useApiToast } from '../hooks/useApiToast';

type StudentProfile = {
  student: Student;
  activeEnrollments: Enrollment[];
  completedEnrollments: Enrollment[];
  canceledEnrollments: Enrollment[];
};

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateStudentPayload, studentId?: number) => Promise<void>;
  isSubmitting: boolean;
  student?: Student | null;
}

const formatDateForInput = (value?: string) =>
  value ? new Date(value).toISOString().slice(0, 16) : '';

const sortStudents = (list: Student[]) =>
  [...list].sort((a, b) => a.name.localeCompare(b.name, 'uz', { sensitivity: 'base' }));

const StudentForm = ({ isOpen, onClose, onSubmit, student, isSubmitting }: StudentFormProps) => {
  const [form, setForm] = useState<CreateStudentPayload>({ name: '', email: '', enrolledAt: '' });
  const isEditing = Boolean(student);

  useEffect(() => {
    if (!isOpen) {
      setForm({ name: '', email: '', enrolledAt: '' });
      return;
    }

    if (student) {
      setForm({
        name: student.name,
        email: student.email,
        enrolledAt: formatDateForInput(student.enrolledAt),
      });
    } else {
      setForm({ name: '', email: '', enrolledAt: '' });
    }
  }, [isOpen, student]);

  const handleSubmit = async () => {
    const payload: CreateStudentPayload = {
      ...form,
      enrolledAt: form.enrolledAt ? new Date(form.enrolledAt).toISOString() : undefined,
    };

    try {
      await onSubmit(payload, student?.id);
      onClose();
    } catch {
      // parent already displays toast
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <Card
        shadow="lg"
        borderRadius="xl"
        position="fixed"
        bottom={{ base: 4, md: 8 }}
        right={{ base: 4, md: 8 }}
        maxW="400px"
        w="full"
        zIndex={2000}
        bg="white"
        borderWidth="1px"
        borderColor="teal.200"
      >
        <CardHeader>
          <Heading size="md">{isEditing ? "Talabani tahrirlash" : "Yangi talaba"}</Heading>
        </CardHeader>
        <CardBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Ism familiya</FormLabel>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
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
              <FormLabel>Ro'yxatga olingan sana</FormLabel>
              <Input
                type="datetime-local"
                value={form.enrolledAt ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, enrolledAt: event.target.value }))}
              />
            </FormControl>
            <Stack direction={{ base: 'column', sm: 'row' }} spacing={3}>
              <Button variant="outline" flex={1} onClick={onClose} isDisabled={isSubmitting}>
                Bekor qilish
              </Button>
              <Button colorScheme="teal" flex={1} onClick={handleSubmit} isLoading={isSubmitting}>
                {isEditing ? 'Yangilash' : 'Saqlash'}
              </Button>
            </Stack>
          </Stack>
        </CardBody>
      </Card>
    </Portal>
  );
};

const StudentsPage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile | null>(null);
  const [history, setHistory] = useState<Enrollment[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const drawer = useDisclosure();
  const formDisclosure = useDisclosure();
  const deleteDialog = useDisclosure();
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);
  const { showError, showSuccess } = useApiToast();
  const showErrorRef = useRef(showError);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const toggleStudentCard = (studentId: number) => {
    setExpandedStudentId((prev) => (prev === studentId ? null : studentId));
  };

  const loadStudents = useCallback(
    async (showGlobalSpinner = false): Promise<Student[]> => {
      if (showGlobalSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const list = await api.getStudents();
        const sorted = sortStudents(list);
        setStudents(sorted);
        setExpandedStudentId((prev) => (prev && !sorted.some((student) => student.id === prev) ? null : prev));
        return sorted;
      } catch (error: any) {
        showErrorRef.current?.("Talabalarni yuklab bo'lmadi", error.message ?? "Noma'lum xato");
        return [];
      } finally {
        if (showGlobalSpinner) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadStudents(true);
  }, [loadStudents]);

  const fetchProfile = useCallback(async (studentId: number) => {
    const profile = await api.getStudentProfile(studentId);
    const historyRes = await api.getStudentHistory(studentId);
    return { profile, historyRes };
  }, []);

  const openProfile = useCallback(
    async (student: Student) => {
      try {
        const { profile, historyRes } = await fetchProfile(student.id);
        setSelectedProfile({ ...profile });
        setHistory(historyRes);
        drawer.onOpen();
      } catch (error: any) {
        showErrorRef.current?.("Profilni ochib bo'lmadi", error.message ?? "Noma'lum xato");
      }
    },
    [drawer, fetchProfile],
  );

  const handleSaveStudent = useCallback(
    async (payload: CreateStudentPayload, studentId?: number) => {
      setFormSubmitting(true);
      try {
        if (studentId) {
          const updated = await api.updateStudent(studentId, payload);
          setStudents((prev) => sortStudents(prev.map((student) => (student.id === studentId ? updated : student))));
          showSuccess('Talaba yangilandi');
          setExpandedStudentId((prev) => (prev === studentId ? null : prev));

          if (selectedProfile?.student.id === studentId) {
            try {
              const { profile, historyRes } = await fetchProfile(studentId);
              setSelectedProfile({ ...profile });
              setHistory(historyRes);
            } catch (error: any) {
              showErrorRef.current?.("Profilni yangilab bo'lmadi", error.message ?? "Noma'lum xato");
            }
          }
        } else {
          const created = await api.createStudent(payload);
          setStudents((prev) => sortStudents([...prev, created]));
          showSuccess("Talaba qo'shildi");
        }
      } catch (error: any) {
        showErrorRef.current?.(studentId ? 'Yangilashda xato' : "Saqlashda xato", error.message ?? "Noma'lum xato");
        return Promise.reject(error);
      } finally {
        setFormSubmitting(false);
      }
    },
    [fetchProfile, loadStudents, selectedProfile?.student.id, showSuccess],
  );

  const requestDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
    deleteDialog.onOpen();
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) {
      return;
    }

    setDeleteLoading(true);
    try {
      await api.deleteStudent(studentToDelete.id);
      showSuccess("Talaba o'chirildi");
      if (selectedProfile?.student.id === studentToDelete.id) {
        drawer.onClose();
        setSelectedProfile(null);
        setHistory([]);
        setEditingStudent(null);
      }
      setExpandedStudentId((prev) => (prev === studentToDelete.id ? null : prev));
      await loadStudents(false);
    } catch (error: any) {
      showErrorRef.current?.("Talabani o'chirib bo'lmadi", error.message ?? "Noma'lum xato");
    } finally {
      setDeleteLoading(false);
      setStudentToDelete(null);
      deleteDialog.onClose();
    }
  };

  const stats = useMemo(
    () => ({
      total: students.length,
      active: students.filter((student) => new Date(student.enrolledAt) <= new Date()).length,
    }),
    [students],
  );

  const openCreateForm = () => {
    setEditingStudent(null);
    setExpandedStudentId(null);
    formDisclosure.onOpen();
  };

  const openEditStudent = (student: Student) => {
    setEditingStudent(student);
    formDisclosure.onOpen();
  };

  const handleEditClick = () => {
    if (!selectedProfile) return;
    openEditStudent(selectedProfile.student);
    drawer.onClose();
  };

  const closeForm = () => {
    setEditingStudent(null);
    formDisclosure.onClose();
  };

  return (
    <Stack spacing={8} position="relative">
      <Box>
        <Heading size="lg" mb={2}>
          Talabalar boshqaruvi
        </Heading>
        <Text color="gray.500">Talabalarni ro'yxatga oling va ularning kurs tarixini ko'ring.</Text>
      </Box>

      <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="center">
        <Badge colorScheme="teal" px={4} py={2} borderRadius="lg" fontSize="md">
          Jami talabalar: {stats.total}
        </Badge>
        <Badge colorScheme="purple" px={4} py={2} borderRadius="lg" fontSize="md">
          Faol talabalar: {stats.active}
        </Badge>
        <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} ml={{ base: 0, md: 'auto' }} width={{ base: 'full', md: 'auto' }}>
          <Button leftIcon={<FiRefreshCw />} variant="outline" onClick={() => void loadStudents(false)} isLoading={refreshing}>
            Yangilash
          </Button>
          <Button colorScheme="teal" onClick={openCreateForm}>
            Yangi talaba
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Stack align="center" py={16}>
          <Spinner size="lg" />
        </Stack>
      ) : students.length === 0 ? (
        <Text color="gray.500">Hozircha talaba qo'shilmagan.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
          {students.map((student) => {
            const isExpanded = expandedStudentId === student.id;
            return (
              <Card
                key={student.id}
                shadow="lg"
                borderRadius="xl"
                bg="white"
                cursor="pointer"
                _hover={{ transform: 'translateY(-4px)', shadow: 'xl' }}
                transition="all 0.2s ease"
                onClick={() => toggleStudentCard(student.id)}
              >
                <CardHeader>
                  <Heading size="md">{student.name}</Heading>
                  <Text fontSize="sm" color="gray.500">
                    {student.email}
                  </Text>
                </CardHeader>
                <CardBody>
                  <Stack spacing={3}>
                    <Text fontSize="sm" color="gray.600">
                      Ro'yxatga olingan sana:{' '}
                      <strong>{new Date(student.enrolledAt).toLocaleDateString('uz-UZ')}</strong>
                    </Text>
                    <Badge colorScheme="teal" width="fit-content">
                      ID: {student.id}
                    </Badge>
                    {isExpanded ? (
                      <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} pt={2}>
                        <Button
                          colorScheme="teal"
                          flex={1}
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditStudent(student);
                          }}
                        >
                          Tahrirlash
                        </Button>
                        <Button
                          variant="outline"
                          colorScheme="red"
                          flex={1}
                          onClick={(event) => {
                            event.stopPropagation();
                            requestDeleteStudent(student);
                          }}
                        >
                          O'chirish
                        </Button>
                        <Button
                          variant="ghost"
                          flex={1}
                          onClick={(event) => {
                            event.stopPropagation();
                            void openProfile(student);
                          }}
                        >
                          Profil
                        </Button>
                      </Stack>
                    ) : null}
                  </Stack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <StudentForm
        isOpen={formDisclosure.isOpen}
        onClose={closeForm}
        onSubmit={handleSaveStudent}
        isSubmitting={formSubmitting}
        student={editingStudent}
      />

      <Drawer isOpen={drawer.isOpen} placement="right" size="lg" onClose={drawer.onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            {selectedProfile?.student.name}
            <Text fontSize="sm" color="gray.500">
              {selectedProfile?.student.email}
            </Text>
          </DrawerHeader>
          <DrawerBody>
            {selectedProfile ? (
              <Stack spacing={6}>
                <Stack direction={{ base: 'column', sm: 'row' }} spacing={3}>
                  <Button leftIcon={<FiEdit2 />} colorScheme="teal" onClick={handleEditClick}>
                    Tahrirlash
                  </Button>
                  <Button
                    leftIcon={<FiTrash2 />}
                    colorScheme="red"
                    variant="outline"
                    onClick={() => {
                      requestDeleteStudent(selectedProfile.student);
                    }}
                  >
                    O'chirish
                  </Button>
                </Stack>

                <Box>
                  <Heading size="sm" mb={3}>
                    Faol kurslar
                  </Heading>
                  {selectedProfile.activeEnrollments.length === 0 ? (
                    <Text color="gray.500">Faol kurs mavjud emas.</Text>
                  ) : (
                    <Stack spacing={3}>
                      {selectedProfile.activeEnrollments.map((enroll) => (
                        <Box key={enroll.id} borderLeft="4px solid" borderColor="teal.400" pl={3} py={1}>
                          <Text fontWeight="semibold">{enroll.course?.title ?? "Noma'lum kurs"}</Text>
                          <Text fontSize="sm" color="gray.500">
                            Boshlanish: {enroll.course ? new Date(enroll.course.startDate).toLocaleDateString('uz-UZ') : '-'}
                          </Text>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Box>
                  <Heading size="sm" mb={3}>
                    Yakunlangan kurslar
                  </Heading>
                  {selectedProfile.completedEnrollments.length === 0 ? (
                    <Text color="gray.500">Hali kurs tugallanmagan.</Text>
                  ) : (
                    <Stack spacing={3}>
                      {selectedProfile.completedEnrollments.map((enroll) => (
                        <Box key={enroll.id} borderRadius="md" borderWidth="1px" borderColor="green.200" p={3}>
                          <Text fontWeight="semibold">{enroll.course?.title ?? "Noma'lum kurs"}</Text>
                          <Text fontSize="sm" color="gray.500">
                            Yakunlangan sana:{' '}
                            {enroll.completionDate
                              ? new Date(enroll.completionDate).toLocaleDateString('uz-UZ')
                              : '-'}
                          </Text>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Box>
                  <Heading size="sm" mb={3}>
                    To'liq tarix
                  </Heading>
                  {history.length === 0 ? (
                    <Text color="gray.500">Tarix mavjud emas.</Text>
                  ) : (
                    <Stack spacing={3}>
                      {history.map((enroll) => (
                        <Box key={enroll.id} borderWidth="1px" borderRadius="md" p={3}>
                          <Text fontWeight="semibold">{enroll.course?.title ?? "Noma'lum kurs"}</Text>
                          <Text fontSize="sm" color="gray.500">
                            Status: {enroll.completed ? 'Yakunlangan' : enroll.canceledAt ? 'Bekor qilingan' : 'Faol'}
                          </Text>
                          <Text fontSize="xs" color="gray.400">
                            Yozilgan sana: {new Date(enroll.enrolledDate).toLocaleString('uz-UZ')}
                          </Text>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            ) : (
              <Stack align="center" mt={10}>
                <Spinner />
              </Stack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>


      <AlertDialog
        isOpen={deleteDialog.isOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => {
          setStudentToDelete(null);
          deleteDialog.onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Talabani o'chirish
            </AlertDialogHeader>
            <AlertDialogBody>
              {studentToDelete
                ? `${studentToDelete.name} ismli talabani o'chirishni tasdiqlaysizmi?`
                : "Talabani o'chirishni tasdiqlaysizmi?"}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} onClick={deleteDialog.onClose} isDisabled={deleteLoading}>
                Bekor qilish
              </Button>
              <Button colorScheme="red" ml={3} onClick={confirmDeleteStudent} isLoading={deleteLoading}>
                O'chirish
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

    </Stack>
  );
};

export default StudentsPage;
