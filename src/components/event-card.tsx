import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import {
  computeCounter,
  describeDates,
  formatQuantities,
  nextMilestone,
  type CounterEvent,
} from '@/lib/counter';
import { radius, spacing } from '@/lib/theme';

interface EventCardProps {
  event: CounterEvent & { title: string; emoji: string | null; color: string; pinned?: boolean };
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const { colors } = useTheme();
  const view = computeCounter(event);
  const milestone = nextMilestone(event);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${event.title}: ${view.text}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: event.color }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {event.emoji ? `${event.emoji} ` : ''}
            {event.title || 'Sin título'}
          </Text>
          {event.pinned ? <Text accessibilityLabel="Fijado">📌</Text> : null}
        </View>

        {view.prefix ? (
          <Text style={[styles.small, { color: colors.secondaryText }]}>{view.prefix}</Text>
        ) : null}
        <Text style={[styles.big, { color: event.color }]}>
          {view.parts.length === 0 ? view.text : formatQuantities(view.parts)}
          {view.suffix ? (
            <Text style={[styles.suffix, { color: colors.secondaryText }]}> {view.suffix}</Text>
          ) : null}
        </Text>

        {view.progress !== null && view.status === 'active' ? (
          <View style={[styles.track, { backgroundColor: colors.fill }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: event.color, width: `${Math.round(view.progress * 100)}%` },
              ]}
            />
          </View>
        ) : null}

        <Text style={[styles.small, { color: colors.secondaryText }]}>
          {describeDates(event)}
          {view.detail ? ` · ${view.detail}` : ''}
        </Text>
        {milestone ? (
          <Text style={[styles.small, { color: colors.secondaryText }]}>🎯 {milestone.text}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden' },
  stripe: { width: 6 },
  body: { flex: 1, padding: spacing.md, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 17, fontWeight: '600', marginBottom: spacing.xs },
  small: { fontSize: 14 },
  big: { fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  suffix: { fontSize: 18, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginVertical: spacing.xs },
  fill: { height: '100%' },
});
