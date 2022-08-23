module.exports = {
  dependencies: {
    'react-native-flipper': {
      platforms: { 'ios': null },
    },
    // disable frameprocessor and vision-camera-code-scanner
    // until reanimated v3 offcially supports v8
    'vision-camera-code-scanner': {
      platforms: {
        android: null, // disable Android platform, other platforms will still autolink if provided
      },
    },
    'react-native-vision-camera': {
      platforms: {
        android: null, // disable Android platform, other platforms will still autolink if provided
      },
    },
    'react-native-camera': {
      platforms: {
        ios: null,
      },
    },
    'react-native-cloud-fs': {
      platforms: {
        android: null, // disable Android platform, other platforms will still autolink if provided
      },
    },
    'expo-camera': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
