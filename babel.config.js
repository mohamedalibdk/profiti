module.exports = function (api) {
  api.cache(true);
  const isWeb = process.env.EXPO_WEB === 'true';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          '@': './',
          'react-native-maps': isWeb ? '@react-google-maps/api' : 'react-native-maps',
          'react-native/Libraries/Utilities/codegenNativeCommands': isWeb ? './lib/web/codegenNativeCommands' : 'react-native/Libraries/Utilities/codegenNativeCommands',
          '@react-google-maps/api': '@react-google-maps/api'
        },
        extensions: [
          '.ios.ts',
          '.android.ts',
          '.ts',
          '.ios.tsx',
          '.android.tsx',
          '.tsx',
          '.jsx',
          '.js',
          '.json',
        ],
      }],
    ],
  };
};
