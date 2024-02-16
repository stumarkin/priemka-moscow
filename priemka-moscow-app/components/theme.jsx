import { ThemeProvider, createTheme, lightColors, Text, Button } from '@rneui/themed';

export const theme = createTheme({
  lightColors: {
    ...Platform.select({
      default: lightColors.platform.android,
      ios: lightColors.platform.ios,
    }),
  },
  components: {
      Text: {
        style: {
          fontSize: 14,
          marginBottom: 20,
        }
      },
      Button: {
        buttonStyle: {
          borderRadius: 8,
          padding: 15
        }
      },
      Skeleton: {
        skeletonStyle: {
          backgroundColor: '#FFF',
        }
      },
      Card: {
        containerStyle: {
          margin: 0,
        }
      },
      Skeleton: {
        skeletonStyle: {
          backgroundColor: lightColors.grey5,
        }
      },
      Dialog: {
        overlayStyle: {
          borderRadius: 8,
          width: '90%'
        }
      },
    },
  });