import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { makeStyles, useTheme } from "@/src/theme";
import { Device, DnsRequest, ThreatAlert, TrafficEvent } from "@/src/security/types";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? colors.onSurfaceSecondary} />;
}

export function StatusPill({ label, tone = "info" }: { label: string; tone?: "success" | "warning" | "error" | "info" | "muted" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toneColors = { success: colors.success, warning: colors.warning, error: colors.error, info: colors.info, muted: colors.muted };
  const color = toneColors[tone];
  return <View style={[styles.pill, { backgroundColor: `${color}22`, borderColor: `${color}66` }]}><View style={[styles.pillDot, { backgroundColor: color }]} /><Text style={[styles.pillText, { color }]}>{label}</Text></View>;
}

export function ScreenHeader({ eyebrow, title, subtitle, onAction, actionLabel = "Scan" }: { eyebrow?: string; title: string; subtitle?: string; onAction?: () => void; actionLabel?: string }) {
  const styles = useStyles();
  return <View style={styles.header}>
    <View style={styles.headerCopy}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}><Icon name="radar" size={18} color={styles.headerButtonText.color} /><Text style={styles.headerButtonText}>{actionLabel}</Text></Pressable> : null}
  </View>;
}

export function MetricCard({ icon, label, value, detail, tone = "info" }: { icon: IconName; label: string; value: string; detail: string; tone?: "success" | "warning" | "error" | "info" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toneColors = { success: colors.success, warning: colors.warning, error: colors.error, info: colors.info };
  const color = toneColors[tone];
  return <View style={styles.metricCard}>
    <View style={styles.metricTop}><View style={[styles.metricIcon, { backgroundColor: `${color}22` }]}><Icon name={icon} size={18} color={color} /></View><Text style={styles.metricLabel}>{label}</Text></View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricDetail}>{detail}</Text>
  </View>;
}

export function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const styles = useStyles();
  return <View style={styles.sectionTitle}><Text style={styles.sectionTitleText}>{title}</Text>{action ? <Pressable onPress={onPress} hitSlop={8}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}</View>;
}

export function Sparkline({ values, accent }: { values: number[]; accent?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const lineColor = accent ?? colors.info;
  const max = Math.max(...values);
  const min = Math.min(...values);
  return <View style={styles.chart} accessibilityLabel="Live traffic chart">
    <View style={styles.chartGrid}><View style={styles.gridLine} /><View style={styles.gridLine} /><View style={styles.gridLine} /></View>
    <View style={styles.chartBars}>{values.map((value, index) => <View key={`${value}-${index}`} style={[styles.bar, { height: `${18 + ((value - min) / Math.max(max - min, 1)) * 72}%`, backgroundColor: lineColor, opacity: 0.42 + (index / values.length) * 0.48 }]} />)}</View>
  </View>;
}

function riskTone(risk: Device["risk"]): "success" | "warning" | "error" {
  return risk === "high" ? "error" : risk === "medium" ? "warning" : "success";
}

export function DeviceRow({ device, onPress }: { device: Device; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <Pressable testID={`device-${device.id}`} accessibilityLabel={`Open ${device.name} details`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.deviceRow, pressed && styles.pressed]}>
    <View style={[styles.deviceAvatar, { backgroundColor: `${device.risk === "high" ? colors.error : colors.info}22` }]}><Icon name={device.category === "IoT" ? "speaker-wireless" : device.category === "Entertainment" ? "television" : "laptop"} size={21} color={device.risk === "high" ? colors.error : colors.info} /></View>
    <View style={styles.rowBody}><View style={styles.rowTitleLine}><Text style={styles.rowTitle} numberOfLines={1}>{device.name}</Text><StatusPill label={device.risk.toUpperCase()} tone={riskTone(device.risk)} /></View><Text style={styles.rowMeta}>{device.ip}  ·  {device.mac}</Text><Text style={styles.rowMeta}>{device.connections} connections  ·  {device.lastSeen}</Text></View>
    <Icon name="chevron-right" size={21} color={colors.muted} />
  </Pressable>;
}

export function AlertCard({ alert, onPress }: { alert: ThreatAlert; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = alert.severity === "high" ? colors.error : alert.severity === "medium" ? colors.warning : colors.info;
  return <Pressable testID={`alert-${alert.id}`} accessibilityLabel={`Analyze ${alert.title}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.alertCard, { borderLeftColor: color }, pressed && styles.pressed]}>
    <View style={styles.alertTop}><StatusPill label={alert.severity.toUpperCase()} tone={alert.severity === "high" ? "error" : alert.severity === "medium" ? "warning" : "info"} /><Text style={styles.timestamp}>{alert.timestamp}</Text></View>
    <Text style={styles.alertTitle}>{alert.title}</Text><Text style={styles.alertReason}>{alert.deviceName}  ·  {alert.reason}</Text><Text style={styles.alertEvidence} numberOfLines={2}>{alert.evidence[0]}</Text>
    <View style={styles.alertFooter}><Text style={[styles.analyzeText, { color }]}>Analyze with AI</Text><Icon name="arrow-right" size={18} color={color} /></View>
  </Pressable>;
}

export function TrafficRow({ event }: { event: TrafficEvent }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const tone = event.state === "flagged" ? colors.warning : event.state === "blocked" ? colors.error : colors.success;
  return <View style={styles.dataRow}><View style={[styles.dataIcon, { backgroundColor: `${tone}22` }]}><Icon name={event.state === "flagged" ? "alert-outline" : "swap-horizontal"} size={17} color={tone} /></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{event.deviceName}</Text><Text style={styles.rowMeta}>{event.destination}:{event.port}  ·  {event.protocol}</Text></View><View style={styles.dataRight}><Text style={styles.dataValue}>{event.volume}</Text><Text style={[styles.rowMeta, { color: tone }]}>{event.state}</Text></View></View>;
}

export function DnsRow({ request }: { request: DnsRequest }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const tone = request.status === "blocked" ? colors.error : request.status === "suspicious" ? colors.warning : colors.success;
  return <View style={styles.dataRow}><View style={[styles.dataIcon, { backgroundColor: `${tone}22` }]}><Icon name="dns" size={17} color={tone} /></View><View style={styles.rowBody}><Text style={styles.rowTitle} numberOfLines={1}>{request.domain}</Text><Text style={styles.rowMeta}>{request.deviceName}  ·  {request.category}</Text></View><View style={styles.dataRight}><Text style={[styles.statusText, { color: tone }]}>{request.status}</Text><Text style={styles.rowMeta}>{request.timestamp}</Text></View></View>;
}

export function BottomNav({ active, onChange }: { active: string; onChange: (value: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const items: { key: string; label: string; icon: IconName }[] = [{ key: "overview", label: "Overview", icon: "view-dashboard-outline" }, { key: "devices", label: "Devices", icon: "devices" }, { key: "traffic", label: "Traffic", icon: "chart-timeline-variant" }, { key: "alerts", label: "Alerts", icon: "bell-outline" }, { key: "more", label: "More", icon: "dots-horizontal" }];
  return <View style={styles.bottomNav}>{items.map((item) => { const selected = active === item.key; return <Pressable key={item.key} testID={`nav-${item.key}`} accessibilityLabel={item.label} accessibilityRole="button" onPress={() => onChange(item.key)} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}><Icon name={item.icon} size={22} color={selected ? colors.info : colors.muted} /><Text style={[styles.navLabel, selected && { color: colors.info }]}>{item.label}</Text>{selected ? <View style={styles.navIndicator} /> : null}</Pressable>; })}</View>;
}

const useStyles = makeStyles((colors) => ({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: colors.info, fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: 7 },
  title: { color: colors.onSurface, fontSize: 29, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 7 },
  headerButton: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: colors.surfaceSecondary },
  headerButtonText: { color: colors.info, fontWeight: "700", fontSize: 12 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  pill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  metricCard: { flex: 1, minHeight: 128, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 14 },
  metricTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  metricIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", flexShrink: 1 },
  metricValue: { color: colors.onSurface, fontSize: 25, fontWeight: "800", marginTop: 13 },
  metricDetail: { color: colors.muted, fontSize: 11, marginTop: 3 },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 12 },
  sectionTitleText: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  sectionAction: { color: colors.info, fontSize: 12, fontWeight: "700" },
  chart: { height: 138, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 14 },
  chartGrid: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "space-evenly", paddingHorizontal: 12 },
  gridLine: { height: 1, backgroundColor: colors.divider },
  chartBars: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 3 },
  bar: { flex: 1, minWidth: 3, borderRadius: 3 },
  deviceRow: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginBottom: 9 },
  deviceAvatar: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  rowMeta: { color: colors.muted, fontSize: 11, marginTop: 5 },
  alertCard: { borderLeftWidth: 3, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 14, marginBottom: 10 },
  alertTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timestamp: { color: colors.muted, fontSize: 11 },
  alertTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800", marginTop: 12 },
  alertReason: { color: colors.onSurfaceSecondary, fontSize: 12, marginTop: 5 },
  alertEvidence: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 9 },
  alertFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 13 },
  analyzeText: { fontSize: 12, fontWeight: "800" },
  dataRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingVertical: 11 },
  dataIcon: { width: 35, height: 35, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  dataRight: { alignItems: "flex-end", maxWidth: 96 },
  dataValue: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  bottomNav: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceSecondary, paddingTop: 7, paddingBottom: 7 },
  navItem: { flex: 1, minHeight: 53, alignItems: "center", justifyContent: "center", gap: 3 },
  navLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  navIndicator: { width: 18, height: 2, borderRadius: 1, backgroundColor: colors.info, position: "absolute", bottom: 0 },
}));
