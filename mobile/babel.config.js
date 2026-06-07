module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    ["module:react-native-config"],
    [
      "module-resolver",
      {
        root: ["."],
        extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
        alias: {
          "@screens": "./src/screens",
          "@services": "./src/services",
          "@hooks": "./src/hooks",
          "@navigation": "./src/navigation",
          "@types": "./src/types",
        },
      },
    ],
  ],
};
