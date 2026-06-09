import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { AppNavigator } from "./navigation/AppNavigator";
import { offlineCache } from "./services/offlineCache";
import { pushNotificationService } from "./services/pushNotificationService";

export default function App() {
  const [iniciando, setIniciando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    offlineCache.loadSession().then((session) => {
      setAutenticado(!!session?.token);
      setIniciando(false);
    });
  }, []);

  useEffect(() => {
    if (!autenticado) {
      return;
    }

    pushNotificationService.registerDeviceToken().catch(() => undefined);
    const unsubscribeTokenRefresh =
      pushNotificationService.listenTokenRefresh();
    const unsubscribeForeground =
      pushNotificationService.listenForegroundMessages();

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
    };
  }, [autenticado]);

  if (iniciando) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return <AppNavigator initialRouteName={autenticado ? "Main" : "Login"} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1565C0",
  },
});
