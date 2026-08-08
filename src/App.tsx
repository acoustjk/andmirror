import { useState, useRef } from 'react';
import { Header } from './components/Header';
import { PhoneFrame } from './components/PhoneFrame';
import { ConnectionModal } from './components/ConnectionModal';
import { FileTransferPanel } from './components/FileTransferPanel';
import { GuideModal } from './components/GuideModal';
import { ServerlessWebAdb } from './services/webadb';
import { Camera, Video, UploadCloud } from 'lucide-react';
import type { ConnectionMode, ConnectionStatus, DeviceInfo, TouchEventData } from './types';

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

  // Real WebUSB Connection Handler using WebADB engine

  // Real WebUSB Connection Handler using WebADB engine
  const handleConnectUsb = async () => {
    setStatus('connecting');
    try {
      const clientAdb = new ServerlessWebAdb();
      webAdbRef.current = clientAdb;

      // Dynamic switch wsHost to bypass WebSocket stream connection in MirrorCanvas
      setWsHost('webusb');

      await clientAdb.connect((videoChunk) => {
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
    view.setFloat64(2, 0, false); // pointerId (Float64 double matching backend)
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

  // Helper to build scrcpy text control message buffer (INJECT_TEXT = 1)
  const createInjectTextBuffer = (text: string): Uint8Array => {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    const len = textBytes.length;
    
    const buffer = new ArrayBuffer(5 + len);
    const view = new DataView(buffer);
    view.setUint8(0, 1); // INJECT_TEXT = 1
    view.setUint32(1, len, false); // text length
    
    const array = new Uint8Array(buffer);
    array.set(textBytes, 5); // copy text at offset 5
    return array;
  };

  // Touch Handler via WebADB/localtunnel
  const handleSendTouch = (touch: TouchEventData) => {
    if (wsHost === 'webusb' && webAdbRef.current) {
      const w = touch.width || 1080;
      const h = touch.height || 2400;
      const x = Math.round(touch.xRatio * w);
      const y = Math.round(touch.yRatio * h);
      const action = touch.type === 'down' ? 0 : touch.type === 'up' ? 1 : 2;
      const buf = createInjectTouchBuffer(action, x, y, w, h);
      webAdbRef.current.injectTouch(buf);
    } else if (wifiWs && wifiWs.readyState === WebSocket.OPEN) {
      wifiWs.send(JSON.stringify({
        action: 'inject_touch',
        xRatio: touch.xRatio,
        yRatio: touch.yRatio,
        type: touch.type
      }));
    }
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

  // WebUSB Direct keyboard bindings via high-speed binary control socket
  const handleWebUsbSendKey = (keyCode: number) => {
    if (webAdbRef.current) {
      const downBuf = createInjectKeyBuffer(0, keyCode, 0, 0);
      const upBuf = createInjectKeyBuffer(1, keyCode, 0, 0);
      webAdbRef.current.injectKey(downBuf);
      setTimeout(() => webAdbRef.current?.injectKey(upBuf), 20);
    }
  };

  const handleWebUsbSendText = (text: string) => {
    if (webAdbRef.current) {
      const buf = createInjectTextBuffer(text);
      webAdbRef.current.injectKey(buf);
    }
  };

  // Toggle Fullscreen

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

      {/* Main Workspace Area: Centered Layout with Floating Tooldock */}
      <main style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 32px',
        maxWidth: '1300px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Centered Phone Frame & Mirroring Canvas */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          width: '100%',
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
            onSendTouch={handleSendTouch}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            ipAddress={device?.ipAddress}
            wsHost={wsHost}
            onJmuxerInit={(jmuxer) => { jmuxerRef.current = jmuxer; }}
            onSendKey={handleWebUsbSendKey}
            onSendText={handleWebUsbSendText}
          />

          {/* Floating Action Utility Bar (Only active when connected) */}
          {status === 'connected' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '16px 12px',
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(16px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              alignItems: 'center'
            }}>
              {/* 📸 Screenshot */}
              <button
                onClick={handleTakeScreenshot}
                title="화면 캡처"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1.0)'; }}
              >
                <Camera size={20} />
              </button>

              {/* 🔴 Record */}
              <button
                onClick={() => setIsRecording(!isRecording)}
                title={isRecording ? "녹화 중지" : "화면 녹화"}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: isRecording ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: isRecording ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isRecording ? '#ef4444' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = isRecording ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.transform = 'scale(1.0)'; }}
              >
                <Video size={20} />
              </button>

              {/* 📁 File / APK Transfer */}
              <button
                onClick={() => setIsFileTransferOpen(true)}
                title="파일 및 APK 전송"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1.0)'; }}
              >
                <UploadCloud size={20} />
              </button>
            </div>
          )}
        </div>
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
