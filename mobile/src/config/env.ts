import { NativeModules } from "react-native";

type MobileEnv = {
  MS1_BASE_URL: string;
  MS2_BASE_URL: string;
  MS3_BASE_URL: string;
};

type NativeConfigModule = {
  getConfig?: () => { config?: Partial<MobileEnv> } | Partial<MobileEnv>;
};

const DEFAULT_ENV: MobileEnv = {
  MS1_BASE_URL: "http://192.168.26.18:8081",
  MS2_BASE_URL: "http://192.168.26.18:8002/api",
  MS3_BASE_URL: "http://192.168.26.18:3000/api",
};

function readNativeConfig(): Partial<MobileEnv> {
  const configModule = NativeModules.RNCConfigModule as
    | NativeConfigModule
    | undefined;

  if (!configModule?.getConfig) {
    return {};
  }

  const nativeConfig = configModule.getConfig();
  if (
    "config" in nativeConfig &&
    typeof nativeConfig.config === "object" &&
    nativeConfig.config !== null
  ) {
    return nativeConfig.config;
  }

  return nativeConfig as Partial<MobileEnv>;
}

const nativeConfig = readNativeConfig();

export const env: MobileEnv = {
  MS1_BASE_URL: nativeConfig.MS1_BASE_URL ?? DEFAULT_ENV.MS1_BASE_URL,
  MS2_BASE_URL: nativeConfig.MS2_BASE_URL ?? DEFAULT_ENV.MS2_BASE_URL,
  MS3_BASE_URL: nativeConfig.MS3_BASE_URL ?? DEFAULT_ENV.MS3_BASE_URL,
};
