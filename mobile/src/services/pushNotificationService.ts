import { Alert, PermissionsAndroid, Platform } from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  AuthorizationStatus,
  FirebaseMessagingTypes,
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission as requestMessagingPermission,
} from "@react-native-firebase/messaging";
import { offlineCache } from "./offlineCache";
import { ms3Service } from "./ms3Service";
import type { Notificacion } from "../types/activo.types";

const firebaseMessaging = getMessaging(getApp());

function mapRemoteMessage(
  message: FirebaseMessagingTypes.RemoteMessage,
): Notificacion {
  const tipo = message.data?.tipo;
  const activoId = message.data?.activoId;

  return {
    id: message.messageId ?? `${Date.now()}`,
    titulo: message.notification?.title ?? "Nueva alerta",
    mensaje: message.notification?.body ?? "Tienes una notificación pendiente.",
    tipo:
      tipo === "mantenimiento" ||
      tipo === "alerta" ||
      tipo === "info" ||
      tipo === "baja"
        ? tipo
        : "info",
    activoId: typeof activoId === "string" ? activoId : undefined,
    leida: false,
    fechaCreacion: new Date().toISOString(),
  };
}

async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android" || Platform.Version < 33) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    {
      title: "Permiso de notificaciones",
      message:
        "La app necesita enviar alertas de mantenimiento y vencimientos.",
      buttonPositive: "Permitir",
      buttonNegative: "Denegar",
    },
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function requestPermission(): Promise<boolean> {
  const androidGranted = await requestAndroidNotificationPermission();
  if (!androidGranted) {
    return false;
  }

  const authorizationStatus =
    await requestMessagingPermission(firebaseMessaging);
  return (
    authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

async function registerDeviceToken(): Promise<string | null> {
  const session = await offlineCache.loadSession();
  if (!session) {
    return null;
  }

  const granted = await requestPermission();
  if (!granted) {
    return null;
  }

  await registerDeviceForRemoteMessages(firebaseMessaging);
  const token = await getToken(firebaseMessaging);
  await ms3Service.registrarTokenPush(session.usuario.id, token);
  return token;
}

function listenTokenRefresh(): () => void {
  return onTokenRefresh(firebaseMessaging, async (token) => {
    const session = await offlineCache.loadSession();
    if (session) {
      await ms3Service.registrarTokenPush(session.usuario.id, token);
    }
  });
}

function listenForegroundMessages(
  onNotification?: (notification: Notificacion) => void,
  options: { showAlert?: boolean } = {},
): () => void {
  return onMessage(firebaseMessaging, async (message) => {
    const showAlert = options.showAlert ?? true;
    const notification = mapRemoteMessage(message);
    onNotification?.(notification);
    if (showAlert) {
      Alert.alert(notification.titulo, notification.mensaje);
    }
  });
}

export const pushNotificationService = {
  mapRemoteMessage,
  registerDeviceToken,
  listenTokenRefresh,
  listenForegroundMessages,
};
