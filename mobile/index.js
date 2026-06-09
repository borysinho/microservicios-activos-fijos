/**
 * Activos Fijos — App Móvil
 * @format
 */

import { AppRegistry } from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import App from "./src/App";
import { name as appName } from "./app.json";

const firebaseMessaging = getMessaging(getApp());

setBackgroundMessageHandler(firebaseMessaging, async () => {
  // Firebase entrega aquí los mensajes recibidos en background/quit state.
});

AppRegistry.registerComponent(appName, () => App);
