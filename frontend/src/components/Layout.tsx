import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Text,
  useColorMode,
  useColorModeValue,
  useDisclosure,
  VStack,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  DrawerHeader,
  DrawerCloseButton,
  Button,
  Stack,
} from '@chakra-ui/react';
import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMoon, FiSun, FiMenu } from 'react-icons/fi';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: "Asosiy", path: '/' },
  { label: "Kurslar", path: '/courses' },
  { label: "O'qituvchilar", path: '/instructors' },
  { label: 'Talabalar', path: '/students' },
  { label: "Ro'yxatlar", path: '/enrollments' },
];

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { colorMode, toggleColorMode } = useColorMode();
  const headerBg = useColorModeValue('white', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const renderNavItems = (direction: 'row' | 'column') => (
    <Stack direction={direction} spacing={direction === 'row' ? 2 : 4} w="full">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Button
            key={item.path}
            variant={isActive ? 'solid' : 'ghost'}
            colorScheme={isActive ? 'teal' : undefined}
            justifyContent={direction === 'row' ? 'center' : 'flex-start'}
            onClick={() => {
              navigate(item.path);
              onClose();
            }}
          >
            {item.label}
          </Button>
        );
      })}
    </Stack>
  );

  return (
    <Flex direction="column" minH="100vh">
      <Flex
        as="header"
        position="sticky"
        top={0}
        zIndex={10}
        bg={headerBg}
        borderBottom="1px solid"
        borderColor={borderColor}
        px={{ base: 4, md: 8 }}
        py={4}
        align="center"
        justify="space-between"
      >
        <HStack spacing={4} align="center">
          <IconButton
            display={{ base: 'inline-flex', lg: 'none' }}
            aria-label="Menyuni ochish"
            icon={<FiMenu />}
            variant="ghost"
            onClick={onOpen}
          />
          <Text fontWeight="extrabold" fontSize="lg" color="teal.500">
            Students CRM
          </Text>
        </HStack>

        <HStack spacing={6} align="center">
          <Box display={{ base: 'none', lg: 'block' }}>{renderNavItems('row')}</Box>
          <IconButton
            aria-label="Tungi rejim"
            icon={<Icon as={colorMode === 'light' ? FiMoon : FiSun} />}
            onClick={toggleColorMode}
            variant="ghost"
          />
        </HStack>
      </Flex>

      <Flex flex="1" px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }} justify="center">
        <Box w="full" maxW="1200px">
          {children}
        </Box>
      </Flex>

      <Drawer placement="left" onClose={onClose} isOpen={isOpen} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Menular</DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={4} mt={4}>
              {renderNavItems('column')}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
};

export default Layout;