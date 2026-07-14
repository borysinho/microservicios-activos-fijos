import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";

import type {
  RootStackParamList,
  BottomTabParamList,
} from "../types/activo.types";
import { canMobile, getRoleHomeTitle } from "../auth/mobilePermissions";
import { useSession } from "../hooks/useSession";

// Pantallas (lazy imports para mejor rendimiento)
import LoginScreen from "../screens/LoginScreen";
import ActivosScreen from "../screens/ActivosScreen";
import ActivoDetalleScreen from "../screens/ActivoDetalleScreen";
import DiagnosticoIAScreen from "../screens/DiagnosticoIAScreen";
import HerramientasScreen from "../screens/HerramientasScreen";
import IncidenciasScreen from "../screens/IncidenciasScreen";
import MapaScreen from "../screens/MapaScreen";
import NotificacionesScreen from "../screens/NotificacionesScreen";
import ResultadoDiagnosticoScreen from "../screens/ResultadoDiagnosticoScreen";
import UbicacionGPSInicioScreen from "../screens/UbicacionGPSInicioScreen";
import VerificacionIAInicioScreen from "../screens/VerificacionIAInicioScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

type AppNavigatorProps = {
  initialRouteName: keyof Pick<RootStackParamList, "Login" | "Main">;
};

function MainTabs() {
  const { usuario, cargandoSesion } = useSession();
  const role = usuario?.rol;

  if (cargandoSesion) {
    return (
      <View style={styles.loadingTabs}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

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
        name="Herramientas"
        component={HerramientasScreen}
        options={{
          title: getRoleHomeTitle(role),
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>🏠</Text>
          ),
        }}
      />
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
      {canMobile(role, "notificaciones.ver") && (
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
      )}
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
          name="VerificacionIAInicio"
          component={VerificacionIAInicioScreen}
          options={{ title: "Verificación IA" }}
        />
        <Stack.Screen
          name="DiagnosticoIA"
          component={DiagnosticoIAScreen}
          options={{ title: "Verificación IA", headerShown: false }}
        />
        <Stack.Screen
          name="UbicacionGPSInicio"
          component={UbicacionGPSInicioScreen}
          options={{ title: "Ubicación GPS" }}
        />
        <Stack.Screen
          name="Incidencias"
          component={IncidenciasScreen}
          options={{ title: "Incidencias" }}
        />
        <Stack.Screen
          name="Mapa"
          component={MapaScreen}
          options={{ title: "Ubicación del Activo" }}
        />
        <Stack.Screen
          name="ResultadoDiagnostico"
          component={ResultadoDiagnosticoScreen}
          options={{ title: "Resultado de Verificación" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingTabs: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingBottom: 5,
    height: 60,
  },
});
