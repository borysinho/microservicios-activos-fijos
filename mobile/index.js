/**
 * Activos Fijos — App Móvil
 * @format
 */

import { AppRegistry } from "react-native";
import messaging from "@react-native-firebase/messaging";
import App from "./src/App";
import { name as appName } from "./app.json";

messaging().setBackgroundMessageHandler(async () => {
  // Firebase entrega aquí los mensajes recibidos en background/quit state.
});

AppRegistry.registerComponent(appName, () => App);
