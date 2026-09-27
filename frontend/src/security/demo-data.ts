import { DnsRequest, Device, ThreatAlert, TrafficEvent } from "./types";

export const demoDevices: Device[] = [
  { id: "dev-1", name: "MacBook Pro", ip: "192.168.1.14", mac: "A4:83:E7:2C:91:10", status: "online", risk: "low", category: "Personal", lastSeen: "just now", connections: 18, bytes: "2.4 GB" },
  { id: "dev-2", name: "Pixel 9", ip: "192.168.1.22", mac: "7C:61:93:AE:22:5D", status: "online", risk: "low", category: "Personal", lastSeen: "just now", connections: 12, bytes: "846 MB" },
  { id: "dev-3", name: "Living Room TV", ip: "192.168.1.31", mac: "D8:31:34:10:77:8A", status: "idle", risk: "low", category: "Entertainment", lastSeen: "2 min ago", connections: 5, bytes: "1.1 GB" },
  { id: "dev-4", name: "Unknown device", ip: "192.168.1.47", mac: "02:91:AF:7D:3B:61", status: "online", risk: "high", category: "Unclassified", lastSeen: "4 min ago", connections: 94, bytes: "312 MB" },
  { id: "dev-5", name: "Kitchen speaker", ip: "192.168.1.52", mac: "B0:BE:76:8A:19:44", status: "blocked", risk: "medium", category: "IoT", lastSeen: "18 min ago", connections: 31, bytes: "92 MB" },
];

export const demoTraffic: TrafficEvent[] = [
  { id: "traffic-1", deviceId: "dev-4", deviceName: "Unknown device", destination: "185.199.108.153", port: 443, protocol: "TLS", volume: "18.4 MB", state: "flagged", timestamp: "12 sec ago" },
  { id: "traffic-2", deviceId: "dev-1", deviceName: "MacBook Pro", destination: "142.250.72.14", port: 443, protocol: "TLS", volume: "4.8 MB", state: "allowed", timestamp: "21 sec ago" },
  { id: "traffic-3", deviceId: "dev-2", deviceName: "Pixel 9", destination: "17.248.155.71", port: 443, protocol: "QUIC", volume: "2.1 MB", state: "allowed", timestamp: "36 sec ago" },
  { id: "traffic-4", deviceId: "dev-4", deviceName: "Unknown device", destination: "10.0.0.1", port: 22, protocol: "TCP", volume: "82 KB", state: "flagged", timestamp: "48 sec ago" },
  { id: "traffic-5", deviceId: "dev-3", deviceName: "Living Room TV", destination: "13.107.42.12", port: 443, protocol: "TLS", volume: "1.8 MB", state: "allowed", timestamp: "1 min ago" },
];

export const demoAlerts: ThreatAlert[] = [
  { id: "alert-1", deviceId: "dev-4", deviceName: "Unknown device", severity: "high", title: "Rapid port sweep detected", reason: "Unusual connection fan-out", whatHappened: "This device contacted 47 different devices across 31 ports in a short period.", whySuspicious: "The connection pattern differs sharply from the baseline for this network and resembles reconnaissance behavior.", evidence: ["47 unique destinations in 92 seconds", "31 destination ports", "94 total connections in the last 5 minutes"], threatType: "Potential network reconnaissance", recommendation: "Isolate the device while you verify its owner and review endpoint logs.", timestamp: "4 min ago" },
  { id: "alert-2", deviceId: "dev-5", deviceName: "Kitchen speaker", severity: "medium", title: "Suspicious DNS request", reason: "Domain matches a known tracking cluster", whatHappened: "The speaker requested telemetry-update.services twice after being idle.", whySuspicious: "The domain has a low reputation score and is not typical for the device category.", evidence: ["2 requests in 30 seconds", "Domain age: 11 days", "Device was idle before request"], threatType: "Potential command-and-control beacon", recommendation: "Keep the domain blocked and check for a firmware update.", timestamp: "18 min ago" },
  { id: "alert-3", deviceId: "dev-2", deviceName: "Pixel 9", severity: "low", title: "Activity baseline changed", reason: "Higher than usual outbound traffic", whatHappened: "Outbound traffic was 2.1x above the phone's seven-day baseline.", whySuspicious: "A temporary app update can cause this pattern, so more context is needed before taking action.", evidence: ["846 MB transferred today", "Baseline: 400 MB daily", "Traffic remained on allowed destinations"], threatType: "Possible background sync", recommendation: "Review active apps if the elevated traffic continues.", timestamp: "42 min ago" },
];

export const demoDns: DnsRequest[] = [
  { id: "dns-1", domain: "telemetry-update.services", deviceName: "Kitchen speaker", deviceId: "dev-5", status: "blocked", category: "Low reputation", timestamp: "18 min ago" },
  { id: "dns-2", domain: "api.github.com", deviceName: "MacBook Pro", deviceId: "dev-1", status: "allowed", category: "Developer tools", timestamp: "22 min ago" },
  { id: "dns-3", domain: "cdn.weather-service.net", deviceName: "Pixel 9", deviceId: "dev-2", status: "suspicious", category: "Newly observed", timestamp: "31 min ago" },
  { id: "dns-4", domain: "play.googleapis.com", deviceName: "Pixel 9", deviceId: "dev-2", status: "allowed", category: "System service", timestamp: "39 min ago" },
];

export const trafficSeries = [28, 34, 31, 48, 42, 58, 52, 74, 66, 81, 68, 92, 84, 76, 88, 64, 72, 59, 63, 54, 62, 48, 57, 45];