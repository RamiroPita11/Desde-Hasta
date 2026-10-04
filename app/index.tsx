import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EventCard } from '@/components/event-card';
import { Segmented } from '@/components/segmented';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { signOut } from '@/lib/auth';
import { listEvents, type AppEvent } from '@/lib/events';
import { spacing } from '@/lib/theme';

type Filter = 'active' | 'archived';

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
];

export default function HomeScreen() {
  const { session } = useSession();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('active');
  const [events, setEvents] = useState<AppEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async (which: Filter) => {
    try {
      setEvents(await listEvents(which === 'archived'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los eventos.');
    }
  }, []);

  // Recarga al volver de crear / editar un evento.
  useFocusEffect(
    useCallback(() => {
      void load(filter);
    }, [load, filter]),
  );

  function changeFilter(value: Filter) {
    setFilter(value);
    setEvents(null);
  }

  async function refresh() {
    setRefreshing(true);
    await load(filter);
    setRefreshing(false);
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text
          style={[styles.title, { color: colors.text }]}
          accessibilityRole="header"
          numberOfLines={1}
        >
          Desde / Hasta
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/widget')} hitSlop={8}>
          <Text style={[styles.widgetLink, { color: colors.accent }]}>Widget</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nuevo evento"
          onPress={() => router.push('/event/new')}
          style={({ pressed }) => [
            styles.add,
            { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.addText, { color: colors.onAccent }]}>+</Text>
        </Pressable>
      </View>
      <Segmented options={FILTERS} value={filter} onChange={changeFilter} />
      {error ? <Text style={[styles.message, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );

  const empty =
    events === null ? (
      error ? null : (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      )
    ) : filter === 'active' ? (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🌱</Text>
        <Text style={[styles.message, { color: colors.secondaryText }]}>
          Todavía no tenés eventos. Creá el primero: un viaje, un cumpleaños, cuántos días llevás
          sin fumar…
        </Text>
        <Button title="Crear evento" onPress={() => router.push('/event/new')} />
      </View>
    ) : (
      <Text style={[styles.message, { color: colors.secondaryText }]}>
        No tenés eventos archivados.
      </Text>
    );

  const footer = (
    <View style={styles.footer}>
      <Text style={[styles.email, { color: colors.tertiaryText }]}>{session?.user.email}</Text>
      <Button
        title="Cerrar sesión"
        variant="danger"
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          signOut().catch(() => setSigningOut(false));
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={events ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: {
    padding: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: { gap: spacing.md, marginBottom: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1, fontSize: 32, fontWeight: '800' },
  widgetLink: { fontSize: 17, fontWeight: '600' },
  add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 28, fontWeight: '500', lineHeight: 30 },
  loading: { marginTop: spacing.xl },
  empty: { alignItems: 'stretch', gap: spacing.md, marginTop: spacing.xl },
  emptyEmoji: { fontSize: 56, textAlign: 'center' },
  message: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  footer: { marginTop: spacing.xl, gap: spacing.sm },
  email: { fontSize: 14, textAlign: 'center' },
});
