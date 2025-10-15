import {
  Avatar,
  Box,
  HStack,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Tag,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const roleLabels: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  user: 'Foydalanuvchi',
};

const UserInfoMenu = () => {
  const { user, logout } = useAuth();
  if (!user) {
    return null;
  }

  const roleLabel = roleLabels[user.role] ?? user.role;
  const subtleBg = useColorModeValue('gray.50', 'whiteAlpha.200');

  return (
    <Menu>
      <MenuButton
        px={2}
        py={1}
        borderRadius="md"
        transition="all 0.2s"
        _hover={{ bg: subtleBg }}
      >
        <HStack spacing={3}>
          <Avatar
            size="sm"
            name={user.fullName}
            colorScheme="teal"
          />
          <Box textAlign="left">
            <Text fontWeight="semibold" fontSize="sm">
              {user.fullName}
            </Text>
            <HStack spacing={1} align="center">
              <Tag size="sm" colorScheme="teal">
                {roleLabel}
              </Tag>
              {user.branch?.name && (
                <Tag size="sm" variant="subtle" colorScheme="gray">
                  {user.branch.name}
                </Tag>
              )}
            </HStack>
          </Box>
        </HStack>
      </MenuButton>
      <MenuList>
        <Box px={3} py={2}>
          <Text fontSize="sm" fontWeight="medium">
            {user.email}
          </Text>
        </Box>
        <MenuDivider />
        <MenuItem icon={<FiLogOut />} onClick={logout}>
          Chiqish
        </MenuItem>
      </MenuList>
    </Menu>
  );
};

export default UserInfoMenu;
