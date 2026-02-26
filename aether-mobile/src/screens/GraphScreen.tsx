/**
 * GraphScreen.tsx
 * Interactive SVG force-graph of all note relationships.
 * Nodes = notes, edges = [[wikilinks]].
 * Uses a simple spring-layout simulation run on mount.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RefreshCw } from 'lucide-react-native';

import { Colors, Spacing, FontSize } from '../utils/theme';
import { getAllNodes, getAllEdges, NoteNode, Edge } from '../utils/DatabaseManager';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GRAPH_W = SCREEN_W;
const GRAPH_H = SCREEN_H * 0.65;

// ─── Force-layout helpers ─────────────────────────────────────────────────────

interface NodePos {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  degree: number;
}

function runForceLayout(
  nodes: NoteNode[],
  edges: Edge[],
  iterations = 120
): NodePos[] {
  if (nodes.length === 0) return [];

  const positions: NodePos[] = nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const r = Math.min(GRAPH_W, GRAPH_H) * 0.3;
    return {
      id: n.id,
      title: n.title,
      x: GRAPH_W / 2 + r * Math.cos(angle),
      y: GRAPH_H / 2 + r * Math.sin(angle),
      vx: 0,
      vy: 0,
      degree: 0,
    };
  });

  // Precompute degree
  edges.forEach((e) => {
    const src = positions.find((p) => p.id === e.sourceId);
    const tgt = positions.find((p) => p.id === e.targetId);
    if (src) src.degree++;
    if (tgt) tgt.degree++;
  });

  const indexMap = new Map(positions.map((p, i) => [p.id, i]));

  for (let iter = 0; iter < iterations; iter++) {
    const cooling = 1 - iter / iterations;

    // Repulsion
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (2800 / (dist * dist)) * cooling;
        a.vx += (dx / dist) * force;
        a.vy += (dy / dist) * force;
        b.vx -= (dx / dist) * force;
        b.vy -= (dy / dist) * force;
      }
    }

    // Attraction (edges)
    edges.forEach((e) => {
      const si = indexMap.get(e.sourceId);
      const ti = indexMap.get(e.targetId);
      if (si === undefined || ti === undefined) return;
      const a = positions[si];
      const b = positions[ti];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist / 80) * cooling;
      a.vx += (dx / dist) * force;
      a.vy += (dy / dist) * force;
      b.vx -= (dx / dist) * force;
      b.vy -= (dy / dist) * force;
    });

    // Gravity to centre
    positions.forEach((p) => {
      p.vx += ((GRAPH_W / 2 - p.x) / GRAPH_W) * 0.4 * cooling;
      p.vy += ((GRAPH_H / 2 - p.y) / GRAPH_H) * 0.4 * cooling;
    });

    // Integrate & clamp
    positions.forEach((p) => {
      p.x = Math.max(30, Math.min(GRAPH_W - 30, p.x + p.vx));
      p.y = Math.max(30, Math.min(GRAPH_H - 30, p.y + p.vy));
      p.vx *= 0.6;
      p.vy *= 0.6;
    });
  }

  return positions;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GraphScreen() {
  const navigation = useNavigation<NavProp>();
  const [positions, setPositions] = useState<NodePos[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<NodePos | null>(null);
  const edgeSet = useRef<Set<string>>(new Set());

  const buildGraph = async () => {
    setIsLoading(true);
    try {
      const [nodes, edgeList] = await Promise.all([getAllNodes(), getAllEdges()]);
      edgeSet.current = new Set(edgeList.map((e) => `${e.sourceId}|${e.targetId}`));
      const pos = runForceLayout(nodes, edgeList);
      setPositions(pos);
      setEdges(edgeList);
    } catch (err) {
      console.error('Graph build error', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      buildGraph();
    }, [])
  );

  const nodeRadius = (p: NodePos) => 6 + Math.min(p.degree * 3, 14);

  const isConnectedToSelected = (p: NodePos): boolean => {
    if (!selected) return false;
    return (
      edgeSet.current.has(`${selected.id}|${p.id}`) ||
      edgeSet.current.has(`${p.id}|${selected.id}`)
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Knowledge Graph</Text>
          <Text style={styles.subtitle}>
            {positions.length} nodes · {edges.length} links
          </Text>
        </View>
        <TouchableOpacity onPress={buildGraph} style={styles.refreshBtn}>
          <RefreshCw color={Colors.textSecondary} size={18} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Computing layout…</Text>
        </View>
      ) : positions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No notes to graph</Text>
          <Text style={styles.emptyHint}>Create notes with [[links]] to see the graph</Text>
        </View>
      ) : (
        <>
          <Svg width={GRAPH_W} height={GRAPH_H} style={styles.svg}>
            {/* Edges */}
            {edges.map((e, i) => {
              const src = positions.find((p) => p.id === e.sourceId);
              const tgt = positions.find((p) => p.id === e.targetId);
              if (!src || !tgt) return null;
              const isHighlighted =
                selected &&
                (selected.id === e.sourceId || selected.id === e.targetId);
              return (
                <Line
                  key={i}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isHighlighted ? Colors.accentLight : Colors.edge}
                  strokeWidth={isHighlighted ? 2 : 1}
                  opacity={selected ? (isHighlighted ? 1 : 0.2) : 0.7}
                />
              );
            })}

            {/* Nodes */}
            {positions.map((p) => {
              const r = nodeRadius(p);
              const isSelected = selected?.id === p.id;
              const isLinked = isConnectedToSelected(p);
              const opacity = selected ? (isSelected || isLinked ? 1 : 0.3) : 1;
              return (
                <G
                  key={p.id}
                  onPress={() => setSelected(isSelected ? null : p)}
                >
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={isSelected ? Colors.accentLight : Colors.nodeDefault}
                    opacity={opacity}
                    stroke={isSelected ? '#fff' : 'transparent'}
                    strokeWidth={2}
                  />
                  {(r > 10 || isSelected) && (
                    <SvgText
                      x={p.x}
                      y={p.y - r - 4}
                      fill={Colors.textSecondary}
                      fontSize={10}
                      textAnchor="middle"
                      opacity={opacity}
                    >
                      {p.title.slice(0, 18)}
                    </SvgText>
                  )}
                </G>
              );
            })}
          </Svg>

          {/* Selected node info */}
          {selected && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle} numberOfLines={1}>
                {selected.title}
              </Text>
              <Text style={styles.infoMeta}>
                {selected.degree} link{selected.degree !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                style={styles.openBtn}
                onPress={() =>
                  navigation.navigate('Editor', {
                    noteId: selected.id,
                    title: selected.title,
                  })
                }
              >
                <Text style={styles.openBtnText}>Open Note →</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  svg: { backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 8,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 },
  refreshBtn: { padding: Spacing.sm },

  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.lg },
  emptyHint: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.xs, textAlign: 'center' },

  infoCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accentDim,
  },
  infoTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600' },
  infoMeta: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4 },
  openBtn: {
    marginTop: Spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.accentDim,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  openBtnText: { color: Colors.accentLight, fontSize: FontSize.sm, fontWeight: '600' },
});
