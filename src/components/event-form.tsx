import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { EventCard } from '@/components/event-card';
import { Segmented } from '@/components/segmented';
import { useTheme } from '@/hooks/use-theme';
import {
  addDaysISO,
  daysBetween,
  isISODate,
  todayISO,
  type DisplayUnit,
  type EventKind,
} from '@/lib/counter';
import { EVENT_COLORS, TITLE_MAX, type EventInput } from '@/lib/events';
import { radius, spacing } from '@/lib/theme';

const KIND_OPTIONS: readonly { value: EventKind; label: string }[] = [
  { value: 'since', label: 'Desde' },
  { value: 'until', label: 'Hasta' },
  { value: 'range', label: 'Período' },
];

const KIND_HINTS: Record<EventKind, string> = {
  since: 'Cuenta los días que pasaron desde una fecha.',
  until: 'Cuenta los días que faltan para una fecha.',
  range: 'Muestra en qué día vas de un período (día 12 de 30).',
};

const UNIT_OPTIONS: readonly { value: DisplayUnit; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'days', label: 'Días' },
  { value: 'weeks', label: 'Sem.' },
  { value: 'months', label: 'Meses' },
  { value: 'years', label: 'Años' },
];

export function emptyEventInput(): EventInput {
  return {
    title: '',
    emoji: null,
    color: EVENT_COLORS[0],
    kind: 'since',
    start_date: todayISO(),
    end_date: null,
    count_start_day: false,
    display_unit: 'auto',
    pinned: false,
  };
}

function validate(input: EventInput): string | null {
  if (!input.title.trim()) return 'Ponele un nombre.';
  if (!isISODate(input.start_date)) return 'La fecha no es válida.';
  if (input.kind === 'range') {
    if (!input.end_date || !isISODate(input.end_date)) return 'Falta la fecha de fin.';
    if (daysBetween(input.start_date, input.end_date) < 0) {
      return 'El fin tiene que ser igual o posterior al inicio.';
    }
  }
  return null;
}

interface EventFormProps {
  title: string;
  initial: EventInput;
  onCancel: () => void;
  onSubmit: (input: EventInput) => Promise<void>;
  /** Acciones extra al pie (archivar, borrar). */
  footer?: ReactNode;
}

export function EventForm({ title, initial, onCancel, onSubmit, footer }: EventFormProps) {
  const { colors } = useTheme();
  const [input, setInput] = useState<EventInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof EventInput>(key: K, value: EventInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  function changeKind(kind: EventKind) {
    setInput((prev) => ({
      ...prev,
      kind,
      end_date:
        kind === 'range' ? (prev.end_date ?? safeAddDays(prev.start_date, 29)) : prev.end_date,
    }));
  }

  const invalid = validate(input);
  const datesOk =
    isISODate(input.start_date) &&
    (input.kind !== 'range' ||
      (input.end_date !== null &&
        isISODate(input.end_date) &&
        daysBetween(input.start_date, input.end_date) >= 0));

  async function save() {
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
      setBusy(false);
    }
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, color: colors.text, borderColor: colors.separator },
  ];
  const labelStyle = [styles.label, { color: colors.secondaryText }];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.bar, { borderBottomColor: colors.separator }]}>
        <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={8}>
          <Text style={[styles.barAction, { color: colors.accent }]}>Cancelar</Text>
        </Pressable>
        <Text style={[styles.barTitle, { color: colors.text }]} accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void save()}
          disabled={busy}
          hitSlop={8}
        >
          <Text
            style={[
              styles.barAction,
              styles.barSave,
              { color: busy || invalid ? colors.tertiaryText : colors.accent },
            ]}
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {datesOk ? <EventCard event={input} /> : null}

        <View style={styles.row}>
          <TextInput
            style={[inputStyle, styles.emoji]}
            value={input.emoji ?? ''}
            onChangeText={(text) => set('emoji', text.slice(0, 16) || null)}
            placeholder="🙂"
            placeholderTextColor={colors.tertiaryText}
            accessibilityLabel="Emoji"
          />
          <TextInput
            style={[inputStyle, styles.flex]}
            value={input.title}
            onChangeText={(text) => set('title', text)}
            placeholder="Nombre (ej: Viaje a Japón)"
            placeholderTextColor={colors.tertiaryText}
            maxLength={TITLE_MAX}
            accessibilityLabel="Nombre"
            autoFocus={!initial.title}
          />
        </View>

        <Text style={labelStyle}>Tipo</Text>
        <Segmented options={KIND_OPTIONS} value={input.kind} onChange={changeKind} />
        <Text style={[styles.hint, { color: colors.secondaryText }]}>{KIND_HINTS[input.kind]}</Text>

        <Text style={labelStyle}>
          {input.kind === 'since' ? 'Desde' : input.kind === 'until' ? 'Fecha' : 'Inicio'}
        </Text>
        <DateField
          value={input.start_date}
          onChange={(value) => set('start_date', value)}
          accessibilityLabel="Fecha de inicio"
        />

        {input.kind === 'range' ? (
          <>
            <Text style={labelStyle}>Fin</Text>
            <DateField
              value={input.end_date ?? ''}
              onChange={(value) => set('end_date', value)}
              min={input.start_date}
              accessibilityLabel="Fecha de fin"
            />
          </>
        ) : null}

        {input.kind === 'since' ? (
          <View style={[styles.switchRow, { backgroundColor: colors.card }]}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>
              Contar el primer día como día 1
            </Text>
            <Switch
              value={input.count_start_day}
              onValueChange={(value) => set('count_start_day', value)}
              trackColor={{ true: colors.accent }}
              accessibilityLabel="Contar el primer día como día 1"
            />
          </View>
        ) : null}

        <Text style={labelStyle}>Mostrar en</Text>
        <Segmented
          options={UNIT_OPTIONS}
          value={input.display_unit}
          onChange={(value) => set('display_unit', value)}
        />

        <Text style={labelStyle}>Color</Text>
        <View style={styles.colors}>
          {EVENT_COLORS.map((color) => {
            const selected = input.color === color;
            return (
              <Pressable
                key={color}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Color ${color}`}
                onPress={() => set('color', color)}
                style={[
                  styles.swatch,
                  { backgroundColor: color, borderColor: selected ? colors.text : 'transparent' },
                ]}
              />
            );
          })}
        </View>

        <View style={[styles.switchRow, { backgroundColor: colors.card }]}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Fijar arriba</Text>
          <Switch
            value={input.pinned}
            onValueChange={(value) => set('pinned', value)}
            trackColor={{ true: colors.accent }}
            accessibilityLabel="Fijar arriba"
          />
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button title="Guardar" onPress={() => void save()} loading={busy} />
        {footer}
      </ScrollView>
    </SafeAreaView>
  );
}

function safeAddDays(date: string, days: number): string | null {
  return isISODate(date) ? addDaysISO(date, days) : null;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  barTitle: { fontSize: 17, fontWeight: '600' },
  barAction: { fontSize: 17 },
  barSave: { fontWeight: '600' },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl * 2,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  input: {
    fontSize: 17,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  emoji: { width: 60, textAlign: 'center', paddingHorizontal: 0, fontSize: 24 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.md,
  },
  hint: { fontSize: 14 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  switchLabel: { fontSize: 16, flex: 1 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
  error: { fontSize: 15, textAlign: 'center', marginVertical: spacing.sm },
});
