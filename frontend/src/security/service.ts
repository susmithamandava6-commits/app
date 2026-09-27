import { demoAlerts, demoDns, demoDevices, demoTraffic } from "./demo-data";
import { DnsRequest, Device, ThreatAlert, ThreatExplanation, TrafficEvent } from "./types";

export type SecuritySnapshot = {
  devices: Device[];
  traffic: TrafficEvent[];
  alerts: ThreatAlert[];
  dns: DnsRequest[];
};

export interface SecurityDataSource {
  loadSnapshot(): Promise<SecuritySnapshot>;
  explainThreat(alert: ThreatAlert): Promise<ThreatExplanation>;
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class DemoSecurityService implements SecurityDataSource {
  async loadSnapshot(): Promise<SecuritySnapshot> {
    await wait(450);
    return { devices: demoDevices, traffic: demoTraffic, alerts: demoAlerts, dns: demoDns };
  }

  async explainThreat(alert: ThreatAlert): Promise<ThreatExplanation> {
    await wait(700);
    return {
      summary: alert.whatHappened,
      riskNote: `${alert.whySuspicious} This is potentially suspicious, not proof of malicious activity.`,
      evidence: alert.evidence,
      threatType: alert.threatType,
      recommendedAction: alert.recommendation,
    };
  }
}

export const securityService: SecurityDataSource = new DemoSecurityService();