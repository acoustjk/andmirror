import React from 'react';
import type { ConnectionMode, ConnectionStatus, DeviceInfo } from '../types';
import { 
  Usb, 
  Wifi, 
  Smartphone, 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  RotateCw, 
  Maximize2,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  mode: ConnectionMode;
  setMode: (mode: ConnectionMode) => void;
  status: ConnectionStatus;
  device: DeviceInfo | null;
  onOpenConnectModal: () => void;
  onOpenGuideModal: () => void;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  isLandscape: boolean;
  onToggleLandscape: () => void;
  onToggleFullscreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  setMode,
  status,
  device,
  onOpenConnectModal,
  onOpenGuideModal,
  isAudioEnabled,
  onToggleAudio,
  onToggleLandscape,
  onToggleFullscreen,
}) => {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 28px',
      background: 'rgba(10, 15, 26, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #3DDC84 0%, #00F2FE 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(61, 220, 132, 0.4)',
          color: '#07160c'
        }}>
          <Smartphone size={24} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              DroidMirror <span style={{ color: 'var(--accent-android)', WebkitTextFillColor: 'initial', fontSize: '0.8em' }}>PRO</span>
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'rgba(61, 220, 132, 0.15)',
              color: 'var(--accent-android)',
              border: '1px solid rgba(61, 220, 132, 0.3)'
            }}>
              v2.4 WebUSB/Wi-Fi
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            무설치 웹 브라우저 초저지연 안드로이드 화면 미러링 &amp; 캔버스 제어
          </p>
        </div>
      </div>

      {/* Connection Mode Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.04)',
        padding: '4px',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        gap: '4px'
      }}>
        <button
          onClick={() => setMode('usb')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: mode === 'usb' ? 'var(--accent-android)' : 'transparent',
            color: mode === 'usb' ? '#07160c' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: mode === 'usb' ? '0 0 15px rgba(61, 220, 132, 0.3)' : 'none'
          }}
        >
          <Usb size={16} />
          🔌 USB 직결 (WebUSB)
        </button>

        <button
          onClick={() => setMode('wifi')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: mode === 'wifi' ? 'var(--accent-cyan)' : 'transparent',
            color: mode === 'wifi' ? '#041619' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: mode === 'wifi' ? '0 0 15px rgba(0, 242, 254, 0.3)' : 'none'
          }}
        >
          <Wifi size={16} />
          📶 동일 Wi-Fi 무선연결
        </button>
      </div>

      {/* Connection Status & Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Device Status Badge */}
        <button 
          onClick={onOpenConnectModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            borderRadius: '12px',
            background: status === 'connected' 
              ? 'rgba(61, 220, 132, 0.12)' 
              : status === 'connecting'
              ? 'rgba(255, 183, 3, 0.12)'
              : 'rgba(255, 75, 75, 0.12)',
            border: `1px solid ${
              status === 'connected' 
                ? 'rgba(61, 220, 132, 0.3)' 
                : status === 'connecting'
                ? 'rgba(255, 183, 3, 0.3)'
                : 'rgba(255, 75, 75, 0.3)'
            }`,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <span className={`status-dot ${status}`} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
              {status === 'connected' 
                ? (device ? device.name : '연결됨')
                : status === 'connecting'
                ? '연결 중...'
                : '기기 미연결'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {status === 'connected' 
                ? `${mode === 'usb' ? 'WebUSB 3.2' : `Wi-Fi (${device?.ipAddress || '192.168.0.42'})`}`
                : '클릭하여 기기 연결'}
            </div>
          </div>
          {status === 'connected' ? (
            <CheckCircle2 size={16} color="var(--accent-android)" />
          ) : (
            <Sliders size={16} color="var(--text-muted)" />
          )}
        </button>

        {/* Quick Utility Toggles */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            className="btn-secondary" 
            onClick={onToggleAudio} 
            title={isAudioEnabled ? "소리 끄기" : "소리 켜기"}
            style={{ padding: '9px 12px' }}
          >
            {isAudioEnabled ? <Volume2 size={18} color="var(--accent-android)" /> : <VolumeX size={18} color="var(--text-muted)" />}
          </button>
          
          <button 
            className="btn-secondary" 
            onClick={onToggleLandscape}
            title="화면 회전 (가로/세로)"
            style={{ padding: '9px 12px' }}
          >
            <RotateCw size={18} />
          </button>

          <button 
            className="btn-secondary" 
            onClick={onOpenGuideModal}
            title="연결 설정 도움말"
            style={{ padding: '9px 12px' }}
          >
            <HelpCircle size={18} color="var(--accent-cyan)" />
          </button>

          <button 
            className="btn-secondary" 
            onClick={onToggleFullscreen}
            title="전체 화면"
            style={{ padding: '9px 12px' }}
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
