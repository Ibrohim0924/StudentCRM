import { extendTheme, theme as base } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.800',
      },
    },
  },
  fonts: {
    heading: `"Poppins", ${base.fonts?.heading ?? 'sans-serif'}`,
    body: `"Inter", ${base.fonts?.body ?? 'sans-serif'}`,
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'teal',
      },
      baseStyle: {
        fontWeight: '600',
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: '600',
      },
    },
  },
});

export default theme;
