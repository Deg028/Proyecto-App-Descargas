// Modo «Tonea del PC»: usa Tonea de tu PC (misma Wi-Fi) como motor de descarga. Se conecta escaneando el QR que
// muestra el PC (Cuenta → Usar desde el teléfono) y lo que pulses «Guardar» se copia del PC a la Biblioteca del teléfono.
import { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadFromPc } from '../downloader';
import { C } from '../theme';

const KEY = 'tonea.server';
// Acepta "192.168.1.5", "192.168.1.5:3000" o el enlace completo del QR (con ?t=CLAVE).
const normalize = v => { let [b, q] = v.trim().split('?'); b = b.replace(/\/+$/, ''); if (!b) return ''; if (!/^https?:\/\//i.test(b)) b = 'http://' + b; if (!/:\d+$/.test(b)) b += ':3000'; return q ? b + '/?' + q : b; };
const tokenOf = server => (/[?&]t=([^&#]+)/.exec(server || '') || [])[1] || '';

// Dentro de la página: los enlaces «Guardar» (/files/…) no se abren en el WebView, se avisan a la app para guardarlos en el teléfono.
const INJECT = `(function () {
  if (window.__toneaPhone) return; window.__toneaPhone = true;
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="/files/"]');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'save', href: a.href }));
  }, true);
})(); true;`;

export default function PcWebView({ onBack, onDownloaded }) {
  const [server, setServer] = useState(null), [draft, setDraft] = useState(''), [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false), [canBack, setCanBack] = useState(false), [scanning, setScanning] = useState(false);
  const [note, setNote] = useState(''), [perm, requestPerm] = useCameraPermissions();
  const web = useRef(null), scanned = useRef(false), noteTimer = useRef(null);

  useEffect(() => { AsyncStorage.getItem(KEY).then(v => { if (v) { setServer(v); setDraft(v); } setLoaded(true); }); }, []);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (scanning) { setScanning(false); return true; }
      if (server && !failed && canBack && web.current) { web.current.goBack(); return true; }
      onBack(); return true;
    });
    return () => sub.remove();
  }, [canBack, scanning, server, failed, onBack]);
  useEffect(() => () => clearTimeout(noteTimer.current), []);

  const flash = (msg, ms = 3500) => { clearTimeout(noteTimer.current); setNote(msg); if (ms) noteTimer.current = setTimeout(() => setNote(''), ms); };

  const use = useCallback(async raw => {
    const url = normalize(raw); if (!url) return;
    await AsyncStorage.setItem(KEY, url); setDraft(url); setFailed(false); setServer(url);
  }, []);

  async function startScan() {
    if (!perm || !perm.granted) { const r = await requestPerm(); if (!r.granted) return flash('Sin permiso de cámara: pega el enlace a mano.'); }
    scanned.current = false; setScanning(true);
  }
  function onScan({ data }) {
    if (scanned.current) return;
    if (!/^https?:\/\/[^/]+:\d+\/?\?t=/.test(String(data))) return flash('Ese código no es de Tonea. Usa el de Cuenta → Usar desde el teléfono en el PC.');
    scanned.current = true; setScanning(false); use(String(data));
  }

  async function onMessage(e) {
    let msg; try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.type !== 'save' || !msg.href) return;
    const t = tokenOf(server), url = msg.href + (t ? (msg.href.includes('?') ? '&' : '?') + 't=' + t : '');
    const name = decodeURIComponent((msg.href.split('/files/')[1] || '').split('?')[0]);
    flash('Copiando al teléfono: ' + name, 0);
    try { onDownloaded(await downloadFromPc(url, name)); flash('Guardado en la Biblioteca del teléfono ✓'); }
    catch (err) { flash('No se pudo copiar: ' + (err.message || 'error desconocido')); }
  }

  if (!loaded) return <View style={s.fill} />;

  if (scanning) {
    return (
      <SafeAreaView style={s.fill}>
        <StatusBar style="light" />
        <CameraView style={s.fill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
        <View style={s.scanBar}>
          <Text style={s.p}>Apunta al código QR de Tonea en el PC</Text>
          {!!note && <Text style={s.small}>{note}</Text>}
          <Pressable accessibilityRole="button" onPress={() => setScanning(false)} style={s.ghost}><Text style={s.ghostT}>Cancelar</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!server || failed) {
    return (
      <SafeAreaView style={s.fill}>
        <StatusBar style="light" />
        <View style={s.box}>
          <Text style={s.logo} accessibilityRole="header">Tonea del PC</Text>
          <Text style={s.p}>{failed ? 'No se pudo conectar con el PC.' : 'Descarga a través de tu PC.'}</Text>
          <Text style={s.small}>1. En el PC abre Tonea con «Iniciar Tonea.cmd lan» (o npm run app:lan).{'\n'}2. Allí pulsa el icono de cuenta → Usar desde el teléfono.{'\n'}3. Escanea su código. El teléfono y el PC deben estar en la misma Wi-Fi.</Text>
          <Pressable accessibilityRole="button" onPress={startScan} style={({ pressed }) => [s.btn, pressed && { opacity: 0.8 }]}><Text style={s.btnT}>Escanear código QR</Text></Pressable>
          <Text style={s.label} nativeID="lbl">O pega el enlace</Text>
          <TextInput accessibilityLabelledBy="lbl" style={s.input} value={draft} onChangeText={setDraft} placeholder="192.168.1.25:3000/?t=clave" placeholderTextColor={C.muted}
            autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="go" onSubmitEditing={() => use(draft)} />
          <Pressable accessibilityRole="button" onPress={() => use(draft)} style={s.ghost}><Text style={s.ghostT}>Conectar</Text></Pressable>
          {!!note && <Text style={s.small}>{note}</Text>}
          <Pressable accessibilityRole="button" onPress={onBack} style={s.back}><Text style={s.backT}>← Volver a Tonea</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="light" />
      <View style={s.bar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={s.barBtn}><Text style={s.backT}>← Volver a Tonea</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setServer(null); setFailed(false); }} style={s.barBtn}><Text style={s.backT}>Cambiar PC</Text></Pressable>
      </View>
      <WebView
        ref={web} source={{ uri: server }} style={s.fill} containerStyle={{ backgroundColor: C.bg }}
        javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} allowsFullscreenVideo
        setSupportMultipleWindows={false} originWhitelist={['http://*', 'https://*']}
        injectedJavaScript={INJECT} onMessage={onMessage}
        onNavigationStateChange={n => setCanBack(n.canGoBack)}
        onError={() => setFailed(true)} onHttpError={e => { if (e.nativeEvent.statusCode >= 500) setFailed(true); }}
        startInLoadingState renderLoading={() => <View style={[s.fill, s.center]}><ActivityIndicator color={C.accent} size="large" /></View>}
      />
      {!!note && <View style={s.toast} accessibilityLiveRegion="polite"><Text style={s.toastT}>{note}</Text></View>}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg }, center: { alignItems: 'center', justifyContent: 'center' },
  box: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  logo: { color: C.ink, fontSize: 32, fontWeight: '800' }, p: { color: C.ink, fontSize: 18, fontWeight: '600' },
  small: { color: C.muted, fontSize: 15, lineHeight: 22 }, label: { color: C.ink, fontSize: 15, fontWeight: '600', marginTop: 6 },
  input: { minHeight: 52, borderRadius: 26, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 20, color: C.ink, fontSize: 16 },
  btn: { minHeight: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }, btnT: { color: C.accentInk, fontSize: 17, fontWeight: '800' },
  ghost: { minHeight: 52, borderRadius: 26, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }, ghostT: { color: C.ink, fontSize: 16, fontWeight: '700' },
  back: { minHeight: 48, alignItems: 'center', justifyContent: 'center' }, backT: { color: C.muted, fontSize: 15, fontWeight: '600' },
  bar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 }, barBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  scanBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, gap: 10, backgroundColor: 'rgba(25,24,41,.92)' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 24, padding: 14, borderRadius: 16, backgroundColor: C.surface2 }, toastT: { color: C.ink, fontSize: 14, lineHeight: 20 }
});
