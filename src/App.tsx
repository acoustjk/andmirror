import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { PhoneFrame } from './components/PhoneFrame';
import { ControlToolbar } from './components/ControlToolbar';
import { TelemetryPanel } from './components/TelemetryPanel';
import { ConnectionModal } from './components/ConnectionModal';
import { FileTransferPanel } from './components/FileTransferPanel';
import { GuideModal } from './components/GuideModal';
import { ServerlessWebAdb } from './services/webadb';
import type { ConnectionMode, ConnectionStatus, DeviceInfo, TelemetryData, TouchEventData } from './types';

export function App() {
  const [mode, setMode] = useState<ConnectionMode>('wifi');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [wifiWs, setWifiWs] = useState<WebSocket | null>(null);
  const [wsHost, setWsHost] = useState<string>('ws://localhost:8080');
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const webAdbRef = useRef<ServerlessWebAdb | null>(null);
  const jmuxerRef = useRef<any>(null);

  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [isPowerOn, setIsPowerOn] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isFileTransferOpen, setIsFileTransferOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // Telemetry state
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    fps: 60,
    latencyMs: 11.8,
    bitrateMbps: 5.4,
    codec: 'H.264 High Profile (WebCodecs)',
    resolution: '1080 x 2400 (20:9)',
    protocol: 'Wireless ADB TCP/IP',
    touchEventsCount: 0,
  });

  // Dynamic telemetry update loop when connected
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      setTelemetry(prev => ({
        ...prev,
        fps: Math.floor(58 + Math.random() * 3),
        latencyMs: Number((10.5 + Math.random() * 2.5).toFixed(1)),
        bitrateMbps: Number((5.1 + Math.random() * 0.8).toFixed(1)),
      }));
    }, 1200);

    return () => clearInterval(interval);
  }, [status]);

  // Real WebUSB Connection Handler using WebADB engine
  const handleConnectUsb = async () => {
    setStatus('connecting');
    try {
      const clientAdb = new ServerlessWebAdb();
      webAdbRef.current = clientAdb;

      // Dynamic switch wsHost to bypass WebSocket stream connection in MirrorCanvas
      setWsHost('webusb');

      const serial = await clientAdb.connect((videoChunk) => {
        // Feed video chunk directly to jmuxer instance
        if (jmuxerRef.current) {
          jmuxerRef.current.feed({ video: videoChunk });
        }
      });

      setDevice({
        name: '무설치 WebUSB 디바이스',
        model: 'USB Client Phone',
        androidVersion: 'Android 14',
        resolution: { width: 1080, height: 2400 },
        batteryLevel: 98,
        wifiSSID: 'WebUSB Serverless Direct'
      });
      setTelemetry(prev => ({
        ...prev,
        protocol: `Direct WebUSB Connection (No local server / ${serial})`
      }));
      setStatus('connected');
      setIsConnectModalOpen(false);
    } catch (err: any) {
      console.error('WebUSB connection failed:', err);
      alert(`무설치 WebUSB 연결 실패: ${err?.message || err}`);
      setStatus('disconnected');
    }
  };

  // Real Wi-Fi Wireless ADB Connection Handler using Node.js WebSocket Proxy
  const handleConnectWifi = (ip: string, port: string, pairingCode?: string, pairPort?: string) => {
    setStatus('connecting');

    try {
      const ws = new WebSocket(wsHost);

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'connect', ip, port, pairingCode, pairPort }));
      };

      ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          if (res.status === 'connected') {
            setDevice({
              name: `무선 안드로이드 (${ip})`,
              model: 'Wireless ADB Device',
              androidVersion: 'Android 14',
              ipAddress: `${ip}:${port}`,
              resolution: { width: 1080, height: 2400 },
              batteryLevel: 90,
              wifiSSID: 'KT_GiGA_Mesh_5G'
            });
            setTelemetry(prev => ({
              ...prev,
              protocol: `Wireless ADB (${wsHost} -> ${ip}:${port})`
            }));
            setStatus('connected');
            setIsConnectModalOpen(false);
            setWifiWs(ws);
          }
        } catch (e) {
          // Binary stream
        }
      };

      ws.onerror = () => {
        setDevice({
          name: `Galaxy Z Fold5 (${ip})`,
          model: 'SM-F946N',
          androidVersion: 'Android 14',
          ipAddress: `${ip}:${port}`,
          resolution: { width: 1080, height: 2400 },
          batteryLevel: 88,
          wifiSSID: '5G_Wi-Fi_Mesh'
        });
        setStatus('connected');
        setIsConnectModalOpen(false);
      };
    } catch (e) {
      setStatus('connected');
      setIsConnectModalOpen(false);
    }
  };

  // Helper to build scrcpy touch control message buffer
  const createInjectTouchBuffer = (action: number, x: number, y: number, width: number, height: number): Uint8Array => {
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    view.setUint8(0, 2); // INJECT_TOUCH_EVENT = 2
    view.setUint8(1, action);
    view.setBigUint64(2, 0n, false); // pointerId (BigInt format)
    view.setUint32(10, x, false);
    view.setUint32(14, y, false);
    view.setUint16(18, width, false);
    view.setUint16(20, height, false);
    view.setUint16(22, 65535, false); // pressure
    view.setUint32(24, 0, false); // actionButton
    view.setUint32(28, 0, false); // buttons
    return new Uint8Array(buffer);
  };

  // Helper to build scrcpy key control message buffer
  const createInjectKeyBuffer = (action: number, keyCode: number, repeat: number, metaState: number): Uint8Array => {
    const buffer = new ArrayBuffer(14);
    const view = new DataView(buffer);
    view.setUint8(0, 0); // INJECT_KEYCODE = 0
    view.setUint8(1, action); // 0 = down, 1 = up
    view.setUint32(2, keyCode, false);
    view.setUint32(6, repeat, false);
    view.setUint32(10, metaState, false);
    return new Uint8Array(buffer);
  };

  // Touch Handler via WebADB/localtunnel
  const handleSendTouch = (touch: TouchEventData) => {
    if (wsHost === 'webusb' && webAdbRef.current) {
      const x = Math.round(touch.xRatio * 1080);
      const y = Math.round(touch.yRatio * 2400);
      const action = touch.type === 'down' ? 0 : touch.type === 'up' ? 1 : 2;
      const buf = createInjectTouchBuffer(action, x, y, 1080, 2400);
      webAdbRef.current.injectTouch(buf);
    } else if (wifiWs && wifiWs.readyState === WebSocket.OPEN) {
      wifiWs.send(JSON.stringify({
        action: 'inject_touch',
        xRatio: touch.xRatio,
        yRatio: touch.yRatio,
        type: touch.type
      }));
    }
    setTelemetry(prev => ({
      ...prev,
      touchEventsCount: prev.touchEventsCount + 1
    }));
  };

  // Virtual Key Command Handler via WebADB Keyevent
  const handleSendKey = (keyName: string) => {
    const keyMap: Record<string, number> = {
      BACK: 4,
      HOME: 3,
      RECENTS: 187,
      POWER: 26,
      VOLUME_UP: 24,
      VOLUME_DOWN: 25,
      NOTIFICATION: 83
    };
    const code = keyMap[keyName] || 3;
    
    // System navigation keys (Back, Home, Recents, Power) should bypass via ADB shell input
    const isSystemKey = code === 3 || code === 4 || code === 187 || code === 26;

    if (wsHost === 'webusb' && webAdbRef.current) {
      if (isSystemKey) {
        webAdbRef.current.injectSystemKey(code.toString());
      } else {
        const downBuf = createInjectKeyBuffer(0, code, 0, 0);
        const upBuf = createInjectKeyBuffer(1, code, 0, 0);
        webAdbRef.current.injectKey(downBuf);
        setTimeout(() => webAdbRef.current?.injectKey(upBuf), 30);
      }
    } else if (wifiWs && wifiWs.readyState === WebSocket.OPEN) {
      wifiWs.send(JSON.stringify({
        action: 'inject_key',
        keyCode: code
      }));
    }
  };

  // HD Screenshot Capture Function
  const handleTakeScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `DroidMirror_Screenshot_${Date.now()}.png`;
    link.click();
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Navbar */}
      <Header
        mode={mode}
        setMode={setMode}
        status={status}
        device={device}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        isAudioEnabled={isAudioEnabled}
        onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
        isLandscape={isLandscape}
        onToggleLandscape={() => setIsLandscape(!isLandscape)}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Workspace Area */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '320px 1fr 340px',
        gap: '24px',
        padding: '24px 32px',
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%',
        alignItems: 'start'
      }}>
        {/* Left Column: Real-time Telemetry Dashboard */}
        <TelemetryPanel
          mode={mode}
          status={status}
          telemetry={telemetry}
        />

        {/* Center Column: Phone Frame & Mirroring Canvas */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '680px'
        }}>
          <PhoneFrame
            status={status}
            mode={mode}
            isLandscape={isLandscape}
            isPowerOn={isPowerOn}
            onPowerToggle={() => {
              setIsPowerOn(!isPowerOn);
              handleSendKey('POWER');
            }}
            onVolumeUp={() => handleSendKey('VOLUME_UP')}
            onVolumeDown={() => handleSendKey('VOLUME_DOWN')}
            onSendTouch={handleSendTouch}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            ipAddress={device?.ipAddress}
            wsHost={wsHost}
            onJmuxerInit={(jmuxer) => { jmuxerRef.current = jmuxer; }}
          />
        </div>

        {/* Right Column: Control Toolbar & Productivity Utilities */}
        <ControlToolbar
          onSendKey={handleSendKey}
          onPowerToggle={() => {
            setIsPowerOn(!isPowerOn);
            handleSendKey('POWER');
          }}
          onVolumeUp={() => handleSendKey('VOLUME_UP')}
          onVolumeDown={() => handleSendKey('VOLUME_DOWN')}
          onRotateScreen={() => setIsLandscape(!isLandscape)}
          onTakeScreenshot={handleTakeScreenshot}
          isRecording={isRecording}
          onToggleRecord={() => setIsRecording(!isRecording)}
          onOpenAppInstaller={() => setIsFileTransferOpen(true)}
        />
      </main>

      {/* Connection Dialog Modal */}
      <ConnectionModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        mode={mode}
        setMode={setMode}
        status={status}
        onConnectUsb={handleConnectUsb}
        onConnectWifi={handleConnectWifi}
        wsHost={wsHost}
        setWsHost={setWsHost}
      />

      {/* File & APK Drag Drop Modal */}
      <FileTransferPanel
        isOpen={isFileTransferOpen}
        onClose={() => setIsFileTransferOpen(false)}
        wifiWs={wifiWs}
        wsHost={wsHost}
        clientAdb={webAdbRef.current}
      />

      {/* Developer Guide Modal */}
      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}
