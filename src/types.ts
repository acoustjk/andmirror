export type ConnectionMode = 'usb' | 'wifi';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface DeviceInfo {
  name: string;
  model: string;
  androidVersion: string;
  ipAddress?: string;
  serial?: string;
  resolution: { width: number; height: number };
  batteryLevel: number;
  wifiSSID: string;
}

export interface TelemetryData {
  fps: number;
  latencyMs: number;
  bitrateMbps: number;
  codec: string;
  resolution: string;
  protocol: string;
  touchEventsCount: number;
}

export interface TouchEventData {
  type: 'down' | 'move' | 'up';
  xRatio: number;
  yRatio: number;
  pointerId?: number;
  width?: number;
  height?: number;
}
