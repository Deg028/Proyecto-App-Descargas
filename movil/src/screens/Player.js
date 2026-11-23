import { useEffect } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { C, fmtDur } from '../theme';

function AudioBody({ entry }) {
  const player = useAudioPlayer({ uri: entry.uri });
  const st = useAudioPlayerStatus(player);
  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); player.play(); }, [player]);
  const pct = st.duration ? Math.min(100, (st.currentTime / st.duration) * 100) : 0;
  const skip = d => player.seekTo(Math.max(0, Math.min(st.duration || 0, st.currentTime + d)));
  return (
    <View style={s.body}>
      <View style={s.cover}><Text style={s.coverT}>♪</Text></View>
      <View style={s.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }} accessibilityLabel={fmtDur(st.currentTime) + ' de ' + fmtDur(st.duration)}>
        <View style={[s.fillBar, { width: pct + '%' }]} />
      </View>
      <View style={s.times}><Text style={s.m}>{fmtDur(st.currentTime) || '0:00'}</Text><Text style={s.m}>{fmtDur(st.duration) || '--:--'}</Text></View>
      <View style={s.controls}>
        <Pressable style={s.side} onPress={() => skip(-10)} accessibilityRole="button" accessibilityLabel="Retroceder 10 segundos"><Text style={s.sideT}>−10 s</Text></Pressable>
        <Pressable style={s.main} onPress={() => (st.playing ? player.pause() : player.play())} accessibilityRole="button" accessibilityLabel={st.playing ? 'Pausar' : 'Reproducir'}>
          <Text style={s.mainT}>{st.playing ? 'Pausa' : 'Play'}</Text>
        </Pressable>
        <Pressable style={s.side} onPress={() => skip(10)} accessibilityRole="button" accessibilityLabel="Adelantar 10 segundos"><Text style={s.sideT}>+10 s</Text></Pressable>
      </View>
    </View>
  );
}

function VideoBody({ entry }) {
  const player = useVideoPlayer({ uri: entry.uri }, p => { p.play(); });
  return <View style={s.body}><VideoView player={player} style={s.video} nativeControls allowsFullscreen contentFit="contain" /></View>;
}

export default function Player({ entry, onClose }) {
  return (
    <Modal visible={!!entry} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.fill}>
        {entry && (
          <>
            <View style={s.head}>
              <View style={{ flex: 1 }}>
                <Text style={s.t} numberOfLines={2} accessibilityRole="header">{entry.title}</Text>
                {!!entry.artist && <Text style={s.m} numberOfLines={1}>{entry.artist}</Text>}
              </View>
              <Pressable style={s.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar reproductor"><Text style={s.closeT}>Cerrar</Text></Pressable>
            </View>
            {entry.kind === 'video' ? <VideoBody entry={entry} /> : <AudioBody entry={entry} />}
            <Text style={s.credit}>{entry.credit}</Text>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg, padding: 20 }, head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  t: { color: C.ink, fontSize: 20, fontWeight: '800' }, m: { color: C.muted, fontSize: 13 },
  close: { minHeight: 48, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1, borderColor: C.border, justifyContent: 'center' }, closeT: { color: C.ink, fontWeight: '700' },
  body: { flex: 1, justifyContent: 'center', gap: 16 },
  cover: { alignSelf: 'center', width: 220, height: 220, borderRadius: 32, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }, coverT: { color: C.accent, fontSize: 96 },
  bar: { height: 8, borderRadius: 4, backgroundColor: C.surface2, overflow: 'hidden' }, fillBar: { height: 8, backgroundColor: C.accent },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  side: { minHeight: 56, minWidth: 80, borderRadius: 28, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }, sideT: { color: C.ink, fontWeight: '700' },
  main: { minHeight: 72, minWidth: 120, borderRadius: 36, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }, mainT: { color: C.accentInk, fontSize: 18, fontWeight: '800' },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 12 },
  credit: { color: C.muted, fontSize: 12, lineHeight: 18 }
});
