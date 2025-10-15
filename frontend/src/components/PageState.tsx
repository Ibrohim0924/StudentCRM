import { Box, Button, Heading, Icon, Spinner, Stack, Text } from '@chakra-ui/react';
import { FiInbox } from 'react-icons/fi';

type LoadingStateProps = {
  message?: string;
  description?: string;
};

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType;
};

export const LoadingState = ({ message = "Ma'lumotlar yuklanmoqda...", description }: LoadingStateProps) => (
  <Stack align="center" spacing={3} py={16}>
    <Spinner size="lg" color="teal.500" thickness="4px" />
    <Stack spacing={1} textAlign="center">
      <Text fontWeight="semibold">{message}</Text>
      {description && (
        <Text fontSize="sm" color="gray.500">
          {description}
        </Text>
      )}
    </Stack>
  </Stack>
);

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  icon = FiInbox,
}: EmptyStateProps) => (
  <Stack align="center" spacing={4} py={12}>
    <Box
      borderRadius="full"
      bg="teal.50"
      color="teal.500"
      w={14}
      h={14}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Icon as={icon} boxSize={6} />
    </Box>
    <Stack spacing={1} textAlign="center">
      <Heading size="sm">{title}</Heading>
      {description && (
        <Text fontSize="sm" color="gray.500">
          {description}
        </Text>
      )}
    </Stack>
    {actionLabel && onAction && (
      <Button size="sm" colorScheme="teal" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </Stack>
);
