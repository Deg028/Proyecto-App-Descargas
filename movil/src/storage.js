import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';

const SETTINGS = 'tonea.settings', LIBRARY = 'tonea.library';

export async function loadSettings() {
  try { return { jamendoKey: '', ...JSON.parse((await AsyncStorage.getItem(SETTINGS)) || '{}') }; } catch { return { jamendoKey: '' }; }
}
export const saveSettings = s => AsyncStorage.setItem(SETTINGS, JSON.stringify(s));

// Carga la biblioteca y descarta lo que ya no existe en el teléfono (por si el usuario borró archivos).
export async function loadLibrary() {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(LIBRARY)) || '[]');
    return list.filter(e => { try { return new File(e.uri).exists; } catch { return false; } });
  } catch { return []; }
}
export const saveLibrary = list => AsyncStorage.setItem(LIBRARY, JSON.stringify(list));
