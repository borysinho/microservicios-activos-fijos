import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { AppNavigator } from "./navigation/AppNavigator";
import { offlineCache } from "./services/offlineCache";

export default function App() {
  const [iniciando, setIniciando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    offlineCache.loadSession().then((session) => {
      setAutenticado(!!session?.token);
      setIniciando(false);
    });
  }, []);

  if (iniciando) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1565C0",
  },
});
