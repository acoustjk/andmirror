import React, { useState, useEffect } from 'react';
import { Wifi, BatteryCharging, Signal, Lock } from 'lucide-react';
import { MirrorCanvas } from './MirrorCanvas';
import type { ConnectionStatus, TouchEventData, ConnectionMode } from '../types';

interface PhoneFrameProps {
  status: ConnectionStatus;
  mode: ConnectionMode;
  isLandscape: boolean;
  isPowerOn: boolean;
  onPowerToggle: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onSendTouch: (touch: TouchEventData) => void;
  onOpenConnectModal: () => void;
  ipAddress?: string;
  wsHost?: string;
  onJmuxerInit?: (jmuxer: any) => void;
  onSendKey?: (keyCode: number) => void;
  onSendText?: (text: string) => void;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  status,
  mode,
  isLandscape,
  isPowerOn,
  onPowerToggle,
  onVolumeUp,
  onVolumeDown,
  onSendTouch,
  onOpenConnectModal,
  ipAddress,
  wsHost,
  onJmuxerInit,
  onSendKey,
  onSendText,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const phoneWidth = isLandscape ? 720 : 360;
  const phoneHeight = isLandscape ? 360 : 740;

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      perspective: '1000px'
    }}>
      {/* External Physical Hardware Buttons on Left/Right side of Phone */}
      {/* Right Hardware Power Button */}
      <button
        onClick={onPowerToggle}
        title="전원 / 화면 잠금 버튼"
        style={{
          position: 'absolute',
          right: isLandscape ? 'auto' : '-8px',
          top: isLandscape ? '-8px' : '180px',
          width: isLandscape ? '50px' : '6px',
          height: isLandscape ? '6px' : '50px',
          background: 'linear-gradient(180deg, #475569 0%, #1e293b 100%)',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          boxShadow: '0 0 10px rgba(0,0,0,0.5)',
          zIndex: 10
        }}
      />

      {/* Left Hardware Volume Up Button */}
      <button
        onClick={onVolumeUp}
        title="볼륨 UP"
        style={{
          position: 'absolute',
          left: isLandscape ? 'auto' : '-8px',
          top: isLandscape ? 'auto' : '160px',
          width: isLandscape ? '40px' : '6px',
          height: isLandscape ? '6px' : '40px',
          background: 'linear-gradient(180deg, #475569 0%, #1e293b 100%)',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          zIndex: 10
        }}
      />

      {/* Left Hardware Volume Down Button */}
      <button
        onClick={onVolumeDown}
        title="볼륨 DOWN"
        style={{
          position: 'absolute',
          left: isLandscape ? 'auto' : '-8px',
          top: isLandscape ? 'auto' : '215px',
          width: isLandscape ? '40px' : '6px',
          height: isLandscape ? '6px' : '40px',
          background: 'linear-gradient(180deg, #475569 0%, #1e293b 100%)',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          zIndex: 10
        }}
      />

      {/* Phone Chassis Base */}
      <div style={{
        width: `${phoneWidth}px`,
        height: `${phoneHeight}px`,
        background: '#04070d',
        borderRadius: '38px',
        padding: '12px',
        boxShadow: `
          0 25px 60px rgba(0, 0, 0, 0.8),
          0 0 0 4px #1a2336,
          0 0 0 7px #0e1422,
          0 0 35px ${status === 'connected' ? 'rgba(61, 220, 132, 0.25)' : 'rgba(0,0,0,0.5)'}
        `,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>

        {/* OLED Screen Container */}
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '26px',
          overflow: 'hidden',
          position: 'relative',
          background: isPowerOn ? '#090d16' : '#000000',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {isPowerOn ? (
            <>
              {/* Top Android Status Bar */}
              <div style={{
                height: '28px',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                zIndex: 20,
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#ffffff'
              }}>
                {/* Clock */}
                <span>{timeStr}</span>

                {/* Center Punch-hole Camera */}
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#000000',
                  border: '1.5px solid #1a2234',
                  boxShadow: 'inset 0 0 3px rgba(255,255,255,0.2)'
                }} />

                {/* Network & Battery Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Signal size={12} color="#3DDC84" />
                  <Wifi size={12} color="#00F2FE" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '0.65rem' }}>92%</span>
                    <BatteryCharging size={13} color="#3DDC84" />
                  </div>
                </div>
              </div>

              {/* Main Screen Stream Canvas */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <MirrorCanvas
                  status={status}
                  mode={mode}
                  isLandscape={isLandscape}
                  onSendTouch={onSendTouch}
                  onOpenConnectModal={onOpenConnectModal}
                  ipAddress={ipAddress}
                  wsHost={wsHost}
                  onJmuxerInit={onJmuxerInit}
                  onSendKey={onSendKey}
                  onSendText={onSendText}
                />
              </div>
            </>
          ) : (
            /* Screen Turned Off State */
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-muted)'
            }}>
              <Lock size={32} color="#475569" />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                화면 잠금됨 (전원 끄기 모드)
              </div>
              <button 
                className="btn-primary" 
                onClick={onPowerToggle}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                화면 켜기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
