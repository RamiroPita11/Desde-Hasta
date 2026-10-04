import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EventForm } from '@/components/event-form';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import { formatDays, sinceCount, todayISO } from '@/lib/counter';
import {
  deleteEvent,
  getEvent,
  resetEvent,
  setArchived,
  updateEvent,
  type AppEvent,
} from '@/lib/events';
import { closeModal } from '@/lib/navigation';
import { spacing } from '@/lib/theme';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [event, setEvent] = useState<AppEvent | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getEvent(id)
      .then((row) => {
        if (active) setEvent(row);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'No se pudo cargar el evento.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal.');
      setBusy(false);
    }
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        {event === undefined && !error ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <View style={styles.missing}>
            <Text style={[styles.message, { color: colors.secondaryText }]}>
              {error ?? 'Este evento no existe o fue borrado.'}
            </Text>
            <Button title="Volver" variant="plain" onPress={closeModal} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <EventForm
      title="Editar evento"
      initial={event}
      onCancel={closeModal}
      onSubmit={async (input) => {
        await updateEvent(event.id, input);
        closeModal();
      }}
      footer={
        <View style={styles.actions}>
          {error ? <Text style={[styles.message, { color: colors.danger }]}>{error}</Text> : null}
          {event.kind === 'since' && event.start_date !== todayISO() ? (
            <Button
              title="↺ Reiniciar desde hoy"
              disabled={busy}
              onPress={() =>
                void confirmDestructive(
                  '¿Reiniciar el contador?',
                  `Llevabas ${formatDays(Math.max(0, sinceCount(event, todayISO())))}. El contador vuelve a empezar desde hoy.`,
                  'Reiniciar',
                ).then((ok) => {
                  if (ok) void run(() => resetEvent(event.id));
                })
              }
            />
          ) : null}
          <Button
            title={event.archived ? 'Desarchivar' : 'Archivar'}
            variant="plain"
            disabled={busy}
            onPress={() => void run(() => setArchived(event.id, !event.archived))}
          />
          <Button
            title="Borrar evento"
            variant="danger"
            disabled={busy}
            onPress={() =>
              void confirmDestructive(
                '¿Borrar este evento?',
                `"${event.title}" se borra para siempre. Si solo querés sacarlo de la lista, archivalo.`,
                'Borrar',
              ).then((ok) => {
                if (ok) void run(() => deleteEvent(event.id));
              })
            }
          />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  missing: { gap: spacing.md, alignItems: 'stretch', maxWidth: 440, width: '100%' },
  message: { fontSize: 16, textAlign: 'center' },
  actions: { marginTop: spacing.lg, gap: spacing.xs },
});
