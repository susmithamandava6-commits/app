import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlertCard, BottomNav, DeviceRow, DnsRow, Icon, MetricCard, ScreenHeader, SectionTitle, Sparkline, StatusPill, TrafficRow } from "@/src/components/security-ui";
import { trafficSeries } from "@/src/security/demo-data";
import { securityRepository } from "@/src/security/repository";
import { SecuritySnapshot, securityService } from "@/src/security/service";
import { AppSettings, Device, ThreatAlert, ThreatExplanation } from "@/src/security/types";
import { makeStyles, useTheme } from "@/src/theme";

type Screen = "overview" | "devices" | "traffic" | "alerts" | "dns" | "firewall" | "settings" | "more";

const defaultSettings: AppSettings = { monitoringEnabled: true, alertNotifications: true, scanFrequency: "30 sec", networkName: "Home network" };

export default function Index() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useStyles();
  const [screen, setScreen] = useState<Screen>("overview");
  const [snapshot, setSnapshot] = useState<SecuritySnapshot | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<ThreatAlert | null>(null);
  const [explanation, setExplanation] = useState<ThreatExplanation | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high">("all");
  const [alertFilter, setAlertFilter] = useState<"all" | "high" | "medium">("all");
  const [trafficFilter, setTrafficFilter] = useState<"connections" | "flagged">("connections");

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [nextSnapshot, storedBlocked, storedSettings] = await Promise.all([securityService.loadSnapshot(), securityRepository.getBlockedDeviceIds(), securityRepository.getSettings()]);
      const initialBlocked = nextSnapshot.devices.filter((device) => device.status === "blocked").map((device) => device.id);
      const mergedBlocked = Array.from(new Set([...initialBlocked, ...storedBlocked]));
      setBlockedIds(mergedBlocked);
      setSettings(storedSettings);
      setSnapshot({ ...nextSnapshot, devices: nextSnapshot.devices.map((device) => mergedBlocked.includes(device.id) ? { ...device, status: "blocked" } : device) });
    } catch {
      setError("Telemetry sync failed. The local security service could not be reached.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedAlert) setSelectedAlert(null);
      else if (selectedDevice) setSelectedDevice(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedAlert, selectedDevice]);

  const updateSettings = async (next: AppSettings) => {
    setSettings(next);
    await securityRepository.setSettings(next);
  };

  const confirmFirewallAction = (device: Device, action: "block" | "isolate" | "allow") => {
    const isRemoval = action === "allow";
    const title = action === "isolate" ? "Isolate device?" : action === "block" ? "Block device?" : "Allow device?";
    const message = action === "isolate" ? `${device.name} will be cut off from the network. This demo action is reversible.` : `${device.name} will be ${isRemoval ? "removed from" : "added to"} the local firewall list.`;
    Alert.alert(title, message, [{ text: "Cancel", style: "cancel" }, { text: action === "isolate" ? "Isolate" : action === "block" ? "Block" : "Allow", style: isRemoval ? "default" : "destructive", onPress: () => { void applyFirewallAction(device.id, action); } }]);
  };

  const applyFirewallAction = async (deviceId: string, action: "block" | "isolate" | "allow") => {
    const nextIds = action === "allow" ? blockedIds.filter((id) => id !== deviceId) : Array.from(new Set([...blockedIds, deviceId]));
    setBlockedIds(nextIds);
    await securityRepository.setBlockedDeviceIds(nextIds);
    setSnapshot((current) => current ? { ...current, devices: current.devices.map((device) => device.id === deviceId ? { ...device, status: action === "allow" ? "online" : "blocked" } : device) } : current);
    setSelectedDevice((current) => current?.id === deviceId ? { ...current, status: action === "allow" ? "online" : "blocked" } : current);
    if (action === "isolate") setSelectedAlert(null);
  };

  const openExplanation = async (alert: ThreatAlert) => {
    setSelectedAlert(alert);
    setExplanation(null);
    setExplaining(true);
    const result = await securityService.explainThreat(alert);
    setExplanation(result);
    setExplaining(false);
  };

  const showScreen = (next: string) => {
    if (["overview", "devices", "traffic", "alerts", "more"].includes(next)) setScreen(next as Screen);
    else if (["dns", "firewall", "settings"].includes(next)) setScreen(next as Screen);
    Keyboard.dismiss();
  };

  if (loading) return <View style={styles.loadingScreen}><View style={styles.loadingMark}><Icon name="shield-check" size={40} color={colors.info} /></View><Text style={styles.loadingTitle}>NETSENTINEL AI</Text><Text style={styles.loadingText}>Loading local telemetry...</Text><ActivityIndicator color={colors.info} style={styles.loadingSpinner} /></View>;

  if (error || !snapshot) return <View style={[styles.loadingScreen, { paddingHorizontal: 26 }]}><Icon name="lan-disconnect" size={42} color={colors.error} /><Text style={styles.errorTitle}>Sync unavailable</Text><Text style={styles.loadingText}>{error ?? "No telemetry snapshot is available."}</Text><Pressable accessibilityRole="button" onPress={() => void loadData()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Retry sync</Text></Pressable></View>;

  const devices = snapshot.devices;
  const alerts = snapshot.alerts;
  const blockedCount = devices.filter((device) => blockedIds.includes(device.id)).length;
  const onlineCount = devices.filter((device) => device.status === "online").length;
  const highRiskCount = devices.filter((device) => device.risk === "high").length;
  const metricsWidth = width > 600 ? "24%" : "48%";
  const filteredDevices = devices.filter((device) => device.name.toLowerCase().includes(query.toLowerCase()) && (riskFilter === "all" || device.risk === "high"));
  const filteredAlerts = alerts.filter((alert) => alertFilter === "all" || alert.severity === alertFilter);
  const filteredTraffic = snapshot.traffic.filter((event) => trafficFilter === "connections" || event.state === "flagged");

  const renderOverview = () => <>
    <ScreenHeader eyebrow="NETSENTINEL AI  /  LOCAL DEMO" title="Network command" subtitle={`${settings.networkName}  •  monitored now`} onAction={() => void loadData(true)} actionLabel="Scan" />
    <View style={styles.statusCard}><View style={styles.statusIcon}><Icon name="shield-check" size={27} color={colors.success} /></View><View style={styles.statusCopy}><Text style={styles.statusTitle}>Network protected</Text><Text style={styles.statusSub}>Observe mode is active · no confirmed threats</Text></View><StatusPill label="ACTIVE" tone="success" /></View>
    <View style={styles.metricsGrid}><View style={{ width: metricsWidth }}><MetricCard icon="devices" label="DEVICES ONLINE" value={`${onlineCount}`} detail={`${devices.length} discovered`} tone="info" /></View><View style={{ width: metricsWidth }}><MetricCard icon="swap-horizontal" label="ACTIVE FLOWS" value={`${snapshot.traffic.length}`} detail="last 5 minutes" tone="success" /></View><View style={{ width: metricsWidth }}><MetricCard icon="alert-outline" label="THREATS DETECTED" value={`${alerts.length}`} detail={`${highRiskCount} high-risk device`} tone="warning" /></View><View style={{ width: metricsWidth }}><MetricCard icon="shield-off-outline" label="BLOCKED DEVICES" value={`${blockedCount}`} detail="firewall rules" tone="error" /></View></View>
    <SectionTitle title="Live traffic volume" action="24 min" /><Sparkline values={trafficSeries} />
    <View style={styles.chartLegend}><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.info }]} /><Text style={styles.legendText}>packets / min</Text></View><Text style={styles.legendValue}>92 peak</Text></View>
    <SectionTitle title="Recent security alerts" action="View all" onPress={() => showScreen("alerts")} />
    {alerts.slice(0, 2).map((alert) => <AlertCard key={alert.id} alert={alert} onPress={() => void openExplanation(alert)} />)}
  </>;

  const renderDevices = () => <>
    <ScreenHeader eyebrow="OBSERVE" title="Devices" subtitle={`${devices.length} endpoints seen on the subnet`} onAction={() => void loadData(true)} actionLabel="Rescan" />
    <View style={styles.searchBox}><Icon name="magnify" size={19} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search device, IP, or MAC" placeholderTextColor={colors.muted} style={styles.searchInput} /></View>
    <View style={styles.filterRow}><FilterButton label="All devices" selected={riskFilter === "all"} onPress={() => setRiskFilter("all")} /><FilterButton label="High risk" selected={riskFilter === "high"} onPress={() => setRiskFilter("high")} /></View>
    <SectionTitle title={`${filteredDevices.length} results`} />
    {filteredDevices.length ? filteredDevices.map((device) => <DeviceRow key={device.id} device={device} onPress={() => setSelectedDevice(device)} />) : <EmptyState icon="devices" title="No devices found" message="Try a different search or risk filter." />}
  </>;

  const renderTraffic = () => <>
    <ScreenHeader eyebrow="OBSERVE" title="Network traffic" subtitle="Connection telemetry from the local demo stream" onAction={() => void loadData(true)} actionLabel="Refresh" />
    <View style={styles.trafficSummary}><View><Text style={styles.summaryLabel}>CURRENT THROUGHPUT</Text><Text style={styles.summaryValue}>18.6 <Text style={styles.summaryUnit}>MB/s</Text></Text></View><StatusPill label="STREAMING" tone="success" /></View>
    <SectionTitle title="Traffic stream" /><View style={styles.filterRow}><FilterButton label="All connections" selected={trafficFilter === "connections"} onPress={() => setTrafficFilter("connections")} /><FilterButton label="Flagged only" selected={trafficFilter === "flagged"} onPress={() => setTrafficFilter("flagged")} /></View>
    <View style={styles.dataTable}>{filteredTraffic.map((event) => <TrafficRow key={event.id} event={event} />)}</View>
    <SectionTitle title="Bandwidth pattern" action="last 24 min" /><Sparkline values={[21, 25, 18, 32, 29, 35, 44, 41, 52, 46, 57, 49, 64, 58, 73, 61, 68, 55]} accent={colors.success} />
  </>;

  const renderAlerts = () => <>
    <ScreenHeader eyebrow="DETECT" title="Threat alerts" subtitle="Anomalies with evidence, not assumptions" onAction={() => void loadData(true)} actionLabel="Refresh" />
    <View style={styles.filterRow}><FilterButton label="All" selected={alertFilter === "all"} onPress={() => setAlertFilter("all")} /><FilterButton label="High" selected={alertFilter === "high"} onPress={() => setAlertFilter("high")} /><FilterButton label="Medium" selected={alertFilter === "medium"} onPress={() => setAlertFilter("medium")} /></View>
    <SectionTitle title={`${filteredAlerts.length} anomalies`} action="Evidence-first" />
    {filteredAlerts.length ? filteredAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} onPress={() => void openExplanation(alert)} />) : <EmptyState icon="shield-check" title="Network looks quiet" message="No alerts match this severity filter." />}
  </>;

  const renderMore = () => <><ScreenHeader eyebrow="OPERATE" title="Security tools" subtitle="Move from explanation to a reversible response" /><ToolCard icon="dns" title="DNS security" detail={`${snapshot.dns.filter((request) => request.status !== "allowed").length} requests need review`} onPress={() => showScreen("dns")} /><ToolCard icon="shield-lock-outline" title="Firewall" detail={`${blockedCount} blocked device${blockedCount === 1 ? "" : "s"} · allow or isolate`} onPress={() => showScreen("firewall")} /><ToolCard icon="tune-variant" title="Settings" detail="Monitoring, alerts, and network profile" onPress={() => showScreen("settings")} /><View style={styles.architectureNote}><Icon name="source-branch" size={19} color={colors.info} /><View style={styles.rowBody}><Text style={styles.architectureTitle}>Ready for real telemetry</Text><Text style={styles.rowMeta}>Adapters can connect this service layer to Zeek, Suricata, Pi-hole, nftables, FastAPI, or an LLM later.</Text></View></View></>;

  const renderDns = () => <><ScreenHeader eyebrow="DETECT" title="DNS security" subtitle="Resolver requests and reputation signals" /><View style={styles.dnsBanner}><View style={styles.statusIcon}><Icon name="dns" size={24} color={colors.warning} /></View><View style={styles.statusCopy}><Text style={styles.statusTitle}>{snapshot.dns.filter((request) => request.status !== "allowed").length} requests need review</Text><Text style={styles.statusSub}>One domain is currently blocked by policy.</Text></View></View><SectionTitle title="Resolver activity" />{snapshot.dns.map((request) => <DnsRow key={request.id} request={request} />)}</>;

  const renderFirewall = () => <><ScreenHeader eyebrow="RESPOND" title="Firewall" subtitle="Reversible controls for suspicious endpoints" /><View style={styles.firewallBanner}><Icon name="shield-lock" size={24} color={colors.error} /><View style={styles.rowBody}><Text style={styles.statusTitle}>{blockedCount} device{blockedCount === 1 ? "" : "s"} blocked</Text><Text style={styles.statusSub}>Actions are saved locally for this demo session.</Text></View></View><SectionTitle title="Device rules" />{devices.map((device) => <View key={device.id} style={styles.ruleRow}><View style={styles.ruleDevice}><View style={styles.ruleIcon}><Icon name={device.status === "blocked" ? "shield-off" : "devices"} size={18} color={device.status === "blocked" ? colors.error : colors.info} /></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{device.name}</Text><Text style={styles.rowMeta}>{device.ip}  ·  {device.status === "blocked" ? "blocked by local rule" : "allowed"}</Text></View></View><Pressable accessibilityRole="button" onPress={() => confirmFirewallAction(device, device.status === "blocked" ? "allow" : device.risk === "high" ? "isolate" : "block")} style={({ pressed }) => [styles.smallAction, { borderColor: device.status === "blocked" ? colors.success : device.risk === "high" ? colors.error : colors.border }, pressed && styles.pressed]}><Text style={[styles.smallActionText, { color: device.status === "blocked" ? colors.success : device.risk === "high" ? colors.error : colors.info }]}>{device.status === "blocked" ? "Allow" : device.risk === "high" ? "Isolate" : "Block"}</Text></Pressable></View>)}</>;

  const renderSettings = () => <><ScreenHeader eyebrow="CONFIGURE" title="Settings" subtitle="Tune the monitoring profile for this network" /><View style={styles.settingGroup}><Text style={styles.groupLabel}>MONITORING</Text><SettingToggle title="Monitoring enabled" detail="Keep local observation active" value={settings.monitoringEnabled} onChange={(value) => void updateSettings({ ...settings, monitoringEnabled: value })} /><SettingToggle title="Alert notifications" detail="Show new anomaly signals in the app" value={settings.alertNotifications} onChange={(value) => void updateSettings({ ...settings, alertNotifications: value })} /></View><View style={styles.settingGroup}><Text style={styles.groupLabel}>NETWORK PROFILE</Text><Text style={styles.inputLabel}>Network name</Text><TextInput testID="network-name-input" value={settings.networkName} onChangeText={(value) => { const next = { ...settings, networkName: value }; setSettings(next); void securityRepository.setSettings(next); }} style={styles.settingsInput} placeholderTextColor={colors.muted} /><Text style={styles.inputLabel}>Scan cadence</Text><View style={styles.filterRow}>{(["15 sec", "30 sec", "1 min"] as const).map((value) => <FilterButton key={value} label={value} selected={settings.scanFrequency === value} onPress={() => void updateSettings({ ...settings, scanFrequency: value })} />)}</View></View><View style={styles.settingGroup}><Text style={styles.groupLabel}>SERVICE LAYER</Text><View style={styles.serviceRow}><Icon name="robot-outline" size={20} color={colors.info} /><View style={styles.rowBody}><Text style={styles.rowTitle}>AI explanations</Text><Text style={styles.rowMeta}>Local deterministic demo service · replaceable with Gemini or another provider</Text></View><StatusPill label="LOCAL" tone="info" /></View></View></>;

  const content = screen === "overview" ? renderOverview() : screen === "devices" ? renderDevices() : screen === "traffic" ? renderTraffic() : screen === "alerts" ? renderAlerts() : screen === "dns" ? renderDns() : screen === "firewall" ? renderFirewall() : screen === "settings" ? renderSettings() : renderMore();
  const navScreen = ["dns", "firewall", "settings"].includes(screen) ? "more" : screen;

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView testID="netsentinel-screen" style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: 26 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} tintColor={colors.info} colors={[colors.info]} />} keyboardShouldPersistTaps="handled">{content}</ScrollView>
    <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.surfaceSecondary }}><BottomNav active={navScreen} onChange={showScreen} /></View>

    <Modal visible={Boolean(selectedDevice)} animationType="slide" onRequestClose={() => setSelectedDevice(null)}>
      {selectedDevice ? <View style={[styles.modalScreen, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 12 }]}><ModalHeader title="Device details" onClose={() => setSelectedDevice(null)} /><View style={styles.deviceHero}><View style={styles.largeDeviceIcon}><Icon name="laptop" size={35} color={selectedDevice.risk === "high" ? colors.error : colors.info} /></View><Text style={styles.modalTitle}>{selectedDevice.name}</Text><Text style={styles.modalSubtitle}>{selectedDevice.category}  ·  {selectedDevice.ip}</Text><StatusPill label={`${selectedDevice.risk.toUpperCase()} RISK`} tone={selectedDevice.risk === "high" ? "error" : selectedDevice.risk === "medium" ? "warning" : "success"} /></View><View style={styles.detailGrid}><Detail label="IP address" value={selectedDevice.ip} /><Detail label="MAC address" value={selectedDevice.mac} /><Detail label="Connections" value={`${selectedDevice.connections} observed`} /><Detail label="Traffic volume" value={selectedDevice.bytes} /></View><View style={styles.evidenceCard}><Text style={styles.cardLabel}>WHY THIS DEVICE IS FLAGGED</Text><Text style={styles.cardBody}>{selectedDevice.risk === "high" ? "This endpoint has an unknown identity and a high connection fan-out. Review ownership before allowing more traffic." : "No strong anomaly is currently associated with this endpoint."}</Text></View><Pressable accessibilityRole="button" onPress={() => confirmFirewallAction(selectedDevice, selectedDevice.status === "blocked" ? "allow" : selectedDevice.risk === "high" ? "isolate" : "block")} style={[styles.primaryButton, { backgroundColor: selectedDevice.status === "blocked" ? colors.success : selectedDevice.risk === "high" ? colors.error : colors.info }]}><Icon name={selectedDevice.status === "blocked" ? "shield-check" : selectedDevice.risk === "high" ? "lan-disconnect" : "shield-off-outline"} size={18} color={colors.onBrandPrimary} /><Text style={styles.primaryButtonText}>{selectedDevice.status === "blocked" ? "Allow device" : selectedDevice.risk === "high" ? "Isolate device" : "Block device"}</Text></Pressable></View> : null}
    </Modal>

    <Modal visible={Boolean(selectedAlert)} animationType="slide" onRequestClose={() => setSelectedAlert(null)}>
      {selectedAlert ? <View style={[styles.modalScreen, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 12 }]}><ModalHeader title="AI threat explanation" onClose={() => setSelectedAlert(null)} /><ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}><View style={styles.analysisBanner}><Icon name="brain" size={25} color={colors.info} /><View style={styles.rowBody}><Text style={styles.cardLabel}>EXPLAIN</Text><Text style={styles.analysisTitle}>{selectedAlert.title}</Text><Text style={styles.rowMeta}>{selectedAlert.deviceName}  ·  {selectedAlert.timestamp}</Text></View><StatusPill label={selectedAlert.severity.toUpperCase()} tone={selectedAlert.severity === "high" ? "error" : selectedAlert.severity === "medium" ? "warning" : "info"} /></View>{explaining ? <View style={styles.analysisLoading}><ActivityIndicator color={colors.info} /><Text style={styles.loadingText}>Analyzing structured event evidence...</Text></View> : explanation ? <><AnalysisSection title="What happened" body={explanation.summary} /><AnalysisSection title="Why it may be suspicious" body={explanation.riskNote} /><View style={styles.analysisSection}><Text style={styles.cardLabel}>EVIDENCE</Text>{explanation.evidence.map((item) => <View key={item} style={styles.evidenceLine}><Icon name="check-circle-outline" size={17} color={colors.info} /><Text style={styles.evidenceText}>{item}</Text></View>)}</View><AnalysisSection title="Potential threat type" body={explanation.threatType} /><AnalysisSection title="Recommended response" body={explanation.recommendedAction} /></> : null}</ScrollView>{!explaining ? <View style={styles.modalActions}><Pressable accessibilityRole="button" onPress={() => confirmFirewallAction(devices.find((device) => device.id === selectedAlert.deviceId) ?? devices[0], "isolate")} style={[styles.primaryButton, { flex: 1, backgroundColor: colors.error }]}><Icon name="lan-disconnect" size={17} color={colors.onError} /><Text style={[styles.primaryButtonText, { color: colors.onError }]}>Isolate</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setSelectedAlert(null)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Dismiss</Text></Pressable></View> : null}</View> : null}
    </Modal>
  </KeyboardAvoidingView>;
}

function FilterButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <Pressable testID={`filter-${label.toLowerCase().replace(/\s+/g, "-")}`} accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.filterButton, selected && { backgroundColor: `${colors.info}22`, borderColor: colors.info }, pressed && styles.pressed]}><Text style={[styles.filterText, selected && { color: colors.info }]}>{label}</Text></Pressable>;
}

function ToolCard({ icon, title, detail, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; detail: string; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.toolCard, pressed && styles.pressed]}><View style={styles.toolIcon}><Icon name={icon} size={23} color={colors.info} /></View><View style={styles.rowBody}><Text style={styles.toolTitle}>{title}</Text><Text style={styles.rowMeta}>{detail}</Text></View><Icon name="chevron-right" size={21} color={colors.muted} /></Pressable>;
}

function EmptyState({ icon, title, message }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; message: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <View style={styles.emptyState}><Icon name={icon} size={34} color={colors.muted} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyMessage}>{message}</Text></View>;
}

function SettingToggle({ title, detail, value, onChange }: { title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <View style={styles.settingRow}><View style={styles.rowBody}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowMeta}>{detail}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.surfaceTertiary, true: colors.brandTertiary }} thumbColor={value ? colors.info : colors.muted} /></View>;
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <View style={styles.modalHeader}><Text style={styles.modalHeaderTitle}>{title}</Text><Pressable testID="modal-close" accessibilityLabel="Close modal" accessibilityRole="button" onPress={onClose} style={styles.closeButton}><Icon name="close" size={21} color={colors.onSurface} /></Pressable></View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return <View style={styles.detailItem}><Text style={styles.cardLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function AnalysisSection({ title, body }: { title: string; body: string }) {
  const styles = useStyles();
  return <View style={styles.analysisSection}><Text style={styles.cardLabel}>{title.toUpperCase()}</Text><Text style={styles.cardBody}>{body}</Text></View>;
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  rowMeta: { color: colors.muted, fontSize: 11, marginTop: 5 },
  loadingScreen: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  loadingMark: { width: 78, height: 78, borderRadius: 24, backgroundColor: `${colors.info}22`, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  loadingTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800", letterSpacing: 2 },
  loadingText: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 8 },
  loadingSpinner: { marginTop: 20 },
  errorTitle: { color: colors.onSurface, fontSize: 21, fontWeight: "800", marginTop: 16 },
  primaryButton: { minHeight: 48, borderRadius: 11, backgroundColor: colors.info, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 18 },
  primaryButtonText: { color: colors.onInfo, fontSize: 14, fontWeight: "800" },
  secondaryButton: { minHeight: 48, borderRadius: 11, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", marginTop: 18 },
  secondaryButtonText: { color: colors.onSurfaceSecondary, fontWeight: "800", fontSize: 14 },
  statusCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.success, backgroundColor: `${colors.success}18`, gap: 11 },
  statusIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: `${colors.success}22`, alignItems: "center", justifyContent: "center" },
  statusCopy: { flex: 1 },
  statusTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  statusSub: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginTop: 12 },
  chartLegend: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 9 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: colors.muted, fontSize: 11 },
  legendValue: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  filterButton: { minHeight: 38, borderRadius: 9, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  searchBox: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.surfaceSecondary, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 8 },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 14, minHeight: 44 },
  trafficSummary: { borderRadius: 12, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  summaryValue: { color: colors.onSurface, fontSize: 28, fontWeight: "800", marginTop: 7 },
  summaryUnit: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  dataTable: { borderTopWidth: 1, borderTopColor: colors.divider },
  toolCard: { minHeight: 83, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, flexDirection: "row", alignItems: "center", padding: 14, gap: 12, marginBottom: 10 },
  toolIcon: { width: 43, height: 43, borderRadius: 12, backgroundColor: `${colors.info}18`, alignItems: "center", justifyContent: "center" },
  toolTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  architectureNote: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 14, flexDirection: "row", gap: 11, marginTop: 18 },
  architectureTitle: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "800" },
  dnsBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.warning, backgroundColor: `${colors.warning}14` },
  firewallBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.error, backgroundColor: `${colors.error}14` },
  ruleRow: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 10 },
  ruleDevice: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  ruleIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  smallAction: { minHeight: 36, minWidth: 58, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 },
  smallActionText: { fontSize: 11, fontWeight: "800" },
  settingGroup: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 14 },
  groupLabel: { color: colors.info, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginTop: 10, marginBottom: 5 },
  settingRow: { minHeight: 65, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.divider },
  inputLabel: { color: colors.muted, fontSize: 12, marginTop: 14, marginBottom: 7 },
  settingsInput: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 9, color: colors.onSurface, paddingHorizontal: 12, fontSize: 14 },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 65 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 50, paddingHorizontal: 25 },
  emptyTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: 12 },
  emptyMessage: { color: colors.muted, textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 6 },
  modalScreen: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 16 },
  modalHeader: { minHeight: 50, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalHeaderTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  closeButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  deviceHero: { alignItems: "center", paddingVertical: 12 },
  largeDeviceIcon: { width: 76, height: 76, borderRadius: 23, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  modalTitle: { color: colors.onSurface, fontSize: 23, fontWeight: "800" },
  modalSubtitle: { color: colors.muted, fontSize: 13, marginTop: 5, marginBottom: 12 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 15 },
  detailItem: { width: "48%", borderRadius: 10, backgroundColor: colors.surfaceSecondary, padding: 12, minHeight: 65 },
  cardLabel: { color: colors.info, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 7 },
  detailValue: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700" },
  evidenceCard: { borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 14, marginTop: 12 },
  cardBody: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 21 },
  modalScroll: { paddingBottom: 20 },
  analysisBanner: { flexDirection: "row", alignItems: "flex-start", gap: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.info, backgroundColor: `${colors.info}14`, padding: 14 },
  analysisTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: 2 },
  analysisLoading: { minHeight: 190, alignItems: "center", justifyContent: "center" },
  analysisSection: { borderBottomWidth: 1, borderBottomColor: colors.divider, paddingVertical: 17 },
  evidenceLine: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 8 },
  evidenceText: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 18, flex: 1 },
  modalActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
}));