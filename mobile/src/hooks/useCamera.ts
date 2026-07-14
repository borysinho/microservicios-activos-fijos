import { useRef, useState, useCallback } from "react";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type PhotoFile,
} from "react-native-vision-camera";

interface UseCameraReturn {
  cameraRef: React.RefObject<Camera>;
  device: ReturnType<typeof useCameraDevice>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  takePhoto: () => Promise<PhotoFile>;
  isTakingPhoto: boolean;
}

/** Hook que encapsula la cámara trasera y permisos (CU-34) */
export function useCamera(): UseCameraReturn {
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const takePhoto = useCallback(async (): Promise<PhotoFile> => {
    if (!cameraRef.current) {
      throw new Error("Cámara no disponible");
    }
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        throw new Error("Permiso de cámara denegado");
      }
    }
    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: "off",
        enableShutterSound: false,
      });
      if (!photo.path || photo.width <= 0 || photo.height <= 0) {
        throw new Error("La foto capturada no es valida. Intenta nuevamente.");
      }
      return photo;
    } finally {
      setIsTakingPhoto(false);
    }
  }, [hasPermission, requestPermission]);

  return {
    cameraRef,
    device,
    hasPermission,
    requestPermission,
    takePhoto,
    isTakingPhoto,
  };
}
