// Tonea móvil (Expo Go): busca y descarga música y video con licencia libre (Jamendo, Internet Archive).
import { useCallback, useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Search from './src/screens/Search';
import Library from './src/screens/Library';
import Settings from './src/screens/Settings';
import Player from './src/screens/Player';
import PcWebView from './src/screens/PcWebView';
import { deleteEntry } from './src/downloader';
import { loadLibrary, loadSettings, saveLibrary, saveSettings } from './src/storage';
import { C } from './src/theme';

const TABS = [['search', 'Buscar'], ['library', 'Biblioteca'], ['settings', 'Ajustes']];

export default function App() {
  const [tab, setTab] = useState('search'), [settings, setSettings] = useState({ jamendoKey: '' });
  const [library, setLibrary] = useState([]), [playing, setPlaying] = useState(null), [pc, setPc] = useState(false), [ready, setReady] = useState(false);

  useEffect(() => { Promise.all([loadSettings(), loadLibrary()]).then(([s, l]) => { setSettings(s); setLibrary(l); setReady(true); }); }, []);

  const onDownloaded = useCallback(entry => setLibrary(prev => {
    const next = [entry, ...prev.filter(e => e.id !== entry.id)];
    saveLibrary(next); return next;
  }), []);
  const onDelete = useCallback(entry => { deleteEntry(entry); setLibrary(prev => { const next = prev.filter(e => e.id !== entry.id); saveLibrary(next); return next; }); }, []);
  const onSave = useCallback(async s => { await saveSettings(s); setSettings(s); }, []);

  if (pc) return <PcWebView onBack={() => setPc(false)} onDownloaded={onDownloaded} />;
  if (!ready) return <View style={s.fill} />;

  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="light" />
      <View style={s.fill}>
        {tab === 'search' && <Search settings={settings} onDownloaded={onDownloaded} onOpenSettings={() => setTab('settings')} />}
        {tab === 'library' && <Library library={library} onPlay={setPlaying} onDelete={onDelete} />}
        {tab === 'settings' && <Settings settings={settings} onSave={onSave} onOpenPc={() => setPc(true)} />}
      </View>
      <View style={s.tabs} accessibilityRole="tablist">
        {TABS.map(([id, label]) => (
          <Pressable key={id} onPress={() => setTab(id)} style={[s.tab, tab === id && s.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === id }}>
            <Text style={[s.tabT, tab === id && s.tabTOn]}>{label}{id === 'library' && library.length ? ' (' + library.length + ')' : ''}</Text>
          </Pressable>
        ))}
      </View>
      <Player entry={playing} onClose={() => setPlaying(null)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  tabs: { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  tab: { flex: 1, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }, tabOn: { backgroundColor: C.accent },
  tabT: { color: C.muted, fontWeight: '700', fontSize: 14 }, tabTOn: { color: C.accentInk }
});
