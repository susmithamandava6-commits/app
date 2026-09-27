export type RiskLevel = "low" | "medium" | "high";
export type ThreatSeverity = "low" | "medium" | "high";
export type DeviceStatus = "online" | "idle" | "blocked";

export type Device = {
  id: string;
  name: string;
  ip: string;
  mac: string;
  status: DeviceStatus;
  risk: RiskLevel;
  category: string;
  lastSeen: string;
  connections: number;
  bytes: string;
};

export type TrafficEvent = {
  id: string;
  deviceId: string;
  deviceName: string;
  destination: string;
  port: number;
  protocol: string;
  volume: string;
  state: "allowed" | "flagged" | "blocked";
  timestamp: string;
};

export type ThreatAlert = {
  id: string;
  deviceId: string;
  deviceName: string;
  severity: ThreatSeverity;
  title: string;
  reason: string;
  whatHappened: string;
  whySuspicious: string;
  evidence: string[];
  threatType: string;
  recommendation: string;
  timestamp: string;
};

export type DnsRequest = {
  id: string;
  domain: string;
  deviceName: string;
  deviceId: string;
  status: "allowed" | "blocked" | "suspicious";
  category: string;
  timestamp: string;
};

export type ThreatExplanation = {
  summary: string;
  riskNote: string;
  evidence: string[];
  threatType: string;
  recommendedAction: string;
};

export type AppSettings = {
  monitoringEnabled: boolean;
  alertNotifications: boolean;
  scanFrequency: "15 sec" | "30 sec" | "1 min";
  networkName: string;
};