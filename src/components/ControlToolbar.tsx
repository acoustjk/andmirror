import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Circle, 
  Square, 
  Bell, 
  Power, 
  Volume2, 
  VolumeX, 
  RotateCw, 
  Camera, 
  Video, 
  UploadCloud,
  CheckCircle,
  Download
} from 'lucide-react';

interface ControlToolbarProps {
  onSendKey: (keyName: string) => void;
  onPowerToggle: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onRotateScreen: () => void;
  onTakeScreenshot: () => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  onOpenAppInstaller: () => void;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  onSendKey,
  onPowerToggle,
  onVolumeUp,
  onVolumeDown,
  onRotateScreen,
  onTakeScreenshot,
  isRecording,
  onToggleRecord,
  onOpenAppInstaller,
}) => {
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  const handleKeyClick = (keyName: string, label: string) => {
    onSendKey(keyName);
    setActiveNotice(`${label} 신호 전송됨`);
    setTimeout(() => setActiveNotice(null), 1500);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%',
      maxWidth: '340px'
    }}>
      {/* Toast Notification Alert */}
      {activeNotice && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '10px',
          background: 'rgba(61, 220, 132, 0.15)',
          border: '1px solid rgba(61, 220, 132, 0.4)',
          color: 'var(--accent-android)',
          fontSize: '0.8rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'pulseGlow 1.5s infinite'
        }}>
          <CheckCircle size={16} />
          {activeNotice}
        </div>
      )}

      {/* Android Virtual Navigation Dock */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <h4 style={{ 
          fontSize: '0.75rem', 
          fontWeight: 700, 
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '12px'
        }}>
          안드로이드 소프트 내비게이션 바
        </h4>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px'
        }}>
          <button
            className="btn-secondary"
            onClick={() => handleKeyClick('BACK', '뒤로 가기')}
            title="뒤로 가기 (Back)"
            style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            <ArrowLeft size={20} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.7rem' }}>Back</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => handleKeyClick('HOME', '홈 화면')}
            title="홈 버튼 (Home)"
            style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            <Circle size={20} color="var(--accent-android)" />
            <span style={{ fontSize: '0.7rem' }}>Home</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => handleKeyClick('RECENTS', '최근 앱')}
            title="최근 전환 앱 (Recents)"
            style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            <Square size={20} color="var(--accent-blue)" />
            <span style={{ fontSize: '0.7rem' }}>Recents</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => handleKeyClick('NOTIFICATION', '알림창 드래그')}
            title="상단 알림창 내리기"
            style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            <Bell size={20} color="var(--accent-warning)" />
            <span style={{ fontSize: '0.7rem' }}>Notif</span>
          </button>
        </div>
      </div>

      {/* Hardware & Power Utility Controls */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <h4 style={{ 
          fontSize: '0.75rem', 
          fontWeight: 700, 
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '12px'
        }}>
          하드웨어 &amp; 화면 제어
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            className="btn-secondary"
            onClick={onPowerToggle}
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
          >
            <Power size={18} color="var(--accent-danger)" />
            <span>전원 / 잠금</span>
          </button>

          <button
            className="btn-secondary"
            onClick={onRotateScreen}
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
          >
            <RotateCw size={18} color="var(--accent-cyan)" />
            <span>화면 회전</span>
          </button>

          <button
            className="btn-secondary"
            onClick={onVolumeUp}
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
          >
            <Volume2 size={18} color="var(--accent-android)" />
            <span>볼륨 +</span>
          </button>

          <button
            className="btn-secondary"
            onClick={onVolumeDown}
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
          >
            <VolumeX size={18} color="var(--text-muted)" />
            <span>볼륨 -</span>
          </button>
        </div>
      </div>

      {/* Capture & Recording Utilities */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <h4 style={{ 
          fontSize: '0.75rem', 
          fontWeight: 700, 
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '12px'
        }}>
          미러링 캡처 &amp; 파일 전송
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="btn-secondary"
            onClick={onTakeScreenshot}
            style={{ width: '100%', justifyContent: 'space-between', padding: '12px 16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Camera size={18} color="var(--accent-android)" />
              <span style={{ fontWeight: 600 }}>1-클릭 HD 스크린샷 캡처</span>
            </div>
            <Download size={16} color="var(--text-muted)" />
          </button>

          <button
            onClick={onToggleRecord}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: isRecording ? '1px solid var(--accent-danger)' : '1px solid var(--border-subtle)',
              background: isRecording ? 'rgba(255, 75, 75, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: isRecording ? 'var(--accent-danger)' : 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Video size={18} color={isRecording ? 'var(--accent-danger)' : 'var(--accent-cyan)'} />
              <span>{isRecording ? '화면 녹화 중... (클릭하여 중지)' : '화면 비디오 녹화 시작'}</span>
            </div>
            {isRecording && <span className="status-dot offline" />}
          </button>

          <button
            className="btn-secondary"
            onClick={onOpenAppInstaller}
            style={{ width: '100%', justifyContent: 'flex-start', gap: '10px', padding: '12px 16px' }}
          >
            <UploadCloud size={18} color="var(--accent-purple)" />
            <span>APK 및 파일 드래그앤드롭 전송</span>
          </button>
        </div>
      </div>
    </div>
  );
};
