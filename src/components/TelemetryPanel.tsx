import React from 'react';
import type { TelemetryData, ConnectionMode, ConnectionStatus } from '../types';
import { Activity, Gauge, Zap, Wifi, Usb } from 'lucide-react';

interface TelemetryPanelProps {
  mode: ConnectionMode;
  status: ConnectionStatus;
  telemetry: TelemetryData;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  mode,
  status,
  telemetry,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%',
      maxWidth: '320px'
    }}>
      {/* Real-time Telemetry Dashboard Header */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-android)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>실시간 미러링 텔레메트리</h3>
          </div>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: status === 'connected' ? 'rgba(61, 220, 132, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: status === 'connected' ? 'var(--accent-android)' : 'var(--text-muted)',
            fontWeight: 700
          }}>
            LIVE
          </span>
        </div>

        {/* Meter 1: FPS Counter */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Gauge size={14} color="var(--accent-android)" />
              프레임 레이트 (FPS)
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-android)' }}>
              {status === 'connected' ? `${telemetry.fps} FPS` : '0 FPS'}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: status === 'connected' ? `${(telemetry.fps / 60) * 100}%` : '0%',
              height: '100%',
              background: 'linear-gradient(90deg, #3DDC84 0%, #00F2FE 100%)',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Meter 2: Stream Latency */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} color="var(--accent-cyan)" />
              입력 지연시간 (Latency)
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {status === 'connected' ? `${telemetry.latencyMs.toFixed(1)} ms` : '-- ms'}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: status === 'connected' ? `${Math.min(100, (30 / telemetry.latencyMs) * 100)}%` : '0%',
              height: '100%',
              background: 'var(--accent-cyan)',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Meter 3: Network / USB Bitrate */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {mode === 'usb' ? <Usb size={14} color="var(--accent-android)" /> : <Wifi size={14} color="var(--accent-cyan)" />}
              데이터 대역폭 (Bitrate)
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {status === 'connected' ? `${telemetry.bitrateMbps.toFixed(1)} Mbps` : '0 Mbps'}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: status === 'connected' ? `${(telemetry.bitrateMbps / 10) * 100}%` : '0%',
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent-purple) 0%, var(--accent-blue) 100%)',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Protocol Specifications & Info Cards */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h4 style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '12px'
        }}>
          디코더 &amp; 프로토콜 파이프라인
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
          <div className="glass-card" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>연결 프로토콜:</span>
            <span style={{ fontWeight: 700, color: mode === 'usb' ? 'var(--accent-android)' : 'var(--accent-cyan)' }}>
              {mode === 'usb' ? 'WebUSB 3.2 ADB Direct' : 'Wireless ADB TCP/IP'}
            </span>
          </div>

          <div className="glass-card" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>비디오 디코더:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>WebCodecs (H.264 GPU)</span>
          </div>

          <div className="glass-card" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>스트림 해상도:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{telemetry.resolution}</span>
          </div>

          <div className="glass-card" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>누적 터치 입력:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-android)' }}>
              {telemetry.touchEventsCount} 이벤트
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
