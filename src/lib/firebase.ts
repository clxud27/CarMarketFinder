import { initializeApp } from 'firebase/app';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Tu configuración de Firebase (reemplaza con tus credenciales)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Functions
const functions = getFunctions(app);

// Si estás en desarrollo, conecta al emulador
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { functions };