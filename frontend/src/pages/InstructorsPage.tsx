
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiMail } from 'react-icons/fi';
import { api } from '../api/client';
import {
  Course,
  CreateInstructorPayload,
  Instructor,
  UpdateInstructorPayload,
} from '../api/types';
import { useApiToast } from '../hooks/useApiToast';

const emptyForm: CreateInstructorPayload = { name: '', email: '', bio: '' };

type InstructorFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateInstructorPayload, instructorId?: number) => Promise<void>;
  isSubmitting: boolean;
  instructor?: Instructor | null;
};

const InstructorForm = ({ isOpen, onClose, onSubmit, isSubmitting, instructor }: InstructorFormProps) => {
  const [form, setForm] = useState<CreateInstructorPayload>(emptyForm);

  useEffect(() => {
    if (!isOpen) {
      setForm(emptyForm);
      return;
    }

    if (instructor) {
      setForm({
        name: instructor.name,
        email: instructor.email,
        bio: instructor.bio ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, instructor]);

  const handleSubmit = async () => {
    const payload: CreateInstructorPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      bio: form.bio?.trim() ? form.bio.trim() : undefined,
    };

    if (!payload.name || !payload.email) {
      return;
    }

    try {
      await onSubmit(payload, instructor?.id);
      onClose();
    } catch (error) {
      // xato allaqachon ko'rsatilgan
    }
  };

  if (!isOpen) {
    return null;
  }

  const isEditing = Boolean(instructor);

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
        <Heading size="md">{isEditing ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi"}</Heading>
      </CardHeader>
      <Divider />
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
            <FormLabel>Bio</FormLabel>
            <Textarea
              rows={3}
              value={form.bio ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
            />
          </FormControl>
          <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} pt={2}>
            <Button variant="outline" flex={1} onClick={onClose} isDisabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button colorScheme="teal" flex={1} onClick={handleSubmit} isLoading={isSubmitting}>
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
  const [expandedInstructorId, setExpandedInstructorId] = useState<number | null>(null);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [instructorToDelete, setInstructorToDelete] = useState<Instructor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showError, showSuccess } = useApiToast();
  const formDisclosure = useDisclosure();
  const deleteDialog = useDisclosure();
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);

  const refresh = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }
      try {
        const [instructorsRes, coursesRes] = await Promise.all([api.getInstructors(), api.getCourses()]);
        setInstructors(instructorsRes);
        setCourses(coursesRes);
        setExpandedInstructorId((prev) =>
          prev && !instructorsRes.some((instructor) => instructor.id === prev) ? null : prev,
        );
      } catch (error: any) {
        showError("O'qituvchilarni yuklab bo'lmadi", error.message ?? "Noma'lum xato");
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [showError],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const openCreateForm = () => {
    setEditingInstructor(null);
    formDisclosure.onOpen();
  };

  const handleSaveInstructor = async (
    payload: CreateInstructorPayload,
    instructorId?: number,
  ): Promise<void> => {
    setFormSubmitting(true);
    try {
      if (instructorId) {
        const updatePayload: UpdateInstructorPayload = payload;
        await api.updateInstructor(instructorId, updatePayload);
        showSuccess("O'qituvchi yangilandi");
      } else {
        await api.createInstructor(payload);
        showSuccess("O'qituvchi qo'shildi");
      }
      await refresh(false);
      setExpandedInstructorId(null);
      setEditingInstructor(null);
    } catch (error: any) {
      showError(instructorId ? 'Yangilashda xato' : 'Saqlashda xato', error.message ?? "Noma'lum xato");
      throw error;
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleInstructorCard = (instructor: Instructor) => {
    setExpandedInstructorId((prev) => (prev === instructor.id ? null : instructor.id));
  };

  const handleEditRequest = (instructor: Instructor) => {
    setEditingInstructor(instructor);
    formDisclosure.onOpen();
  };

  const handleDeleteRequest = (instructor: Instructor) => {
    setInstructorToDelete(instructor);
    deleteDialog.onOpen();
  };

  const handleConfirmDelete = async () => {
    if (!instructorToDelete) {
      return;
    }
    setDeleteLoading(true);
    try {
      await api.deleteInstructor(instructorToDelete.id);
      showSuccess("O'qituvchi o'chirildi");
      setExpandedInstructorId((prev) => (prev === instructorToDelete.id ? null : prev));
      await refresh(false);
    } catch (error: any) {
      showError("O'qituvchini o'chirishda xato", error.message ?? "Noma'lum xato");
    } finally {
      setDeleteLoading(false);
      setInstructorToDelete(null);
      deleteDialog.onClose();
    }
  };

  const closeForm = () => {
    setEditingInstructor(null);
    formDisclosure.onClose();
  };

  return (
    <Stack spacing={8} position="relative">
      <Box>
        <Heading size="lg" mb={2}>
          O'qituvchilar ro'yxati
        </Heading>
        <Text color="gray.500">Tajribali murabbiylarni boshqaring va ularning kurslarini kuzating.</Text>
      </Box>

      <Button alignSelf="flex-start" colorScheme="teal" onClick={openCreateForm}>
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
          {instructors.map((instructor) => {
            const isExpanded = expandedInstructorId === instructor.id;
            return (
              <Card
                key={instructor.id}
                shadow="lg"
                borderRadius="xl"
                bg="white"
                cursor="pointer"
                _hover={{ transform: 'translateY(-4px)', shadow: 'xl' }}
                transition="all 0.2s ease"
                onClick={() => toggleInstructorCard(instructor)}
              >
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
                    {isExpanded ? (
                      <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} pt={2}>
                        <Button
                          colorScheme="teal"
                          flex={1}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditRequest(instructor);
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
                            handleDeleteRequest(instructor);
                          }}
                        >
                          O'chirish
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

      <InstructorForm
        isOpen={formDisclosure.isOpen}
        onClose={closeForm}
        onSubmit={handleSaveInstructor}
        isSubmitting={formSubmitting}
        instructor={editingInstructor}
      />

      <AlertDialog
        isOpen={deleteDialog.isOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => {
          setInstructorToDelete(null);
          deleteDialog.onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              O'qituvchini o'chirish
            </AlertDialogHeader>

            <AlertDialogBody>
              {instructorToDelete
                ? `${instructorToDelete.name} ismli o'qituvchini o'chirishni tasdiqlaysizmi?`
                : "O'qituvchini o'chirishni tasdiqlang."}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} onClick={deleteDialog.onClose} isDisabled={deleteLoading}>
                Bekor qilish
              </Button>
              <Button colorScheme="red" ml={3} onClick={handleConfirmDelete} isLoading={deleteLoading}>
                O'chirish
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Stack>
  );
};

export default InstructorsPage;
