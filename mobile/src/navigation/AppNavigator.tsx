import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

import type {
  RootStackParamList,
  BottomTabParamList,
} from "../types/activo.types";

// Pantallas (lazy imports para mejor rendimiento)
import LoginScreen from "../screens/LoginScreen";
import ActivosScreen from "../screens/ActivosScreen";
import ActivoDetalleScreen from "../screens/ActivoDetalleScreen";
import DiagnosticoIAScreen from "../screens/DiagnosticoIAScreen";
import MapaScreen from "../screens/MapaScreen";
import NotificacionesScreen from "../screens/NotificacionesScreen";
import ResultadoDiagnosticoScreen from "../screens/ResultadoDiagnosticoScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

type AppNavigatorProps = {
  initialRouteName: keyof Pick<RootStackParamList, "Login" | "Main">;
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#1565C0",
        tabBarInactiveTintColor: "#78909C",
        headerStyle: { backgroundColor: "#1565C0" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tab.Screen
        name="Activos"
        component={ActivosScreen}
        options={{
          title: "Mis Activos",
          tabBarLabel: "Activos",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Notificaciones"
        component={NotificacionesScreen}
        options={{
          title: "Notificaciones",
          tabBarLabel: "Alertas",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>🔔</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator({ initialRouteName }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: { backgroundColor: "#1565C0" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "700" },
          headerBackTitle: "Volver",
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ActivoDetalle"
          component={ActivoDetalleScreen}
          options={{ title: "Detalle del Activo" }}
        />
        <Stack.Screen
          name="DiagnosticoIA"
          component={DiagnosticoIAScreen}
          options={{ title: "Diagnóstico IA", headerShown: false }}
        />
        <Stack.Screen
          name="Mapa"
          component={MapaScreen}
          options={{ title: "Ubicación del Activo" }}
        />
        <Stack.Screen
          name="ResultadoDiagnostico"
          component={ResultadoDiagnosticoScreen}
          options={{ title: "Resultado del Diagnóstico" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingBottom: 5,
    height: 60,
  },
});
