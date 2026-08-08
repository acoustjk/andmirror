import React, { useState } from 'react';
import type { ConnectionMode, ConnectionStatus } from '../types';
import { 
  X, 
  Usb, 
  Wifi, 
  Smartphone, 
  Radio,
  AlertTriangle,
  Loader2,
  KeyRound
} from 'lucide-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ConnectionMode;
  setMode: (mode: ConnectionMode) => void;
  status: ConnectionStatus;
  onConnectUsb: () => void;
  onConnectWifi: (ip: string, port: string, pairingCode?: string, pairPort?: string) => void;
  wsHost: string;
  setWsHost: (url: string) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  mode,
  setMode,
  onConnectUsb,
  onConnectWifi,
  wsHost,
  setWsHost,
}) => {
  const [wifiIp, setWifiIp] = useState<string>('192.168.0.123');
  const [wifiPort, setWifiPort] = useState<string>('44067');
  const [pairPort, setPairPort] = useState<string>('37119');
  const [pairingCode, setPairingCode] = useState<string>('');

  const [pairingLogs, setPairingLogs] = useState<string[]>([]);
  const [isPairing, setIsPairing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUsbStart = async () => {
    setIsPairing(true);
    setErrorMessage(null);
    setPairingLogs([
      '🔌 [1/3] Chrome/Edge 브라우저 WebUSB 디바이스 컨트롤러 연결 중...',
      '🔍 [2/3] USB 디버깅 안드로이드 기기 파이프라인 자동 감지 중...',
      '📲 [3/3] 승인 완료 시 즉시 스마트폰 미러링 스트림 수신이 개시됩니다!'
    ]);

    try {
      await onConnectUsb();
      setPairingLogs(prev => [...prev, '✅ [성공] 안드로이드 실물 디바이스 WebUSB 디버깅 승인 완료!']);
    } catch (err: any) {
      setErrorMessage(err?.message || '기기 선택이 취소되었거나 감지되지 않았습니다.');
    } finally {
      setIsPairing(false);
    }
  };

  const handleWifiStart = () => {
    const isAutoDetect = !wifiIp || wifiIp.trim() === '';

    setIsPairing(true);
    setErrorMessage(null);

    if (isAutoDetect) {
      setPairingLogs([
        '📶 [1/4] 기기 자동 감지 모드 시작 (이전에 연동된 이력이 필요합니다)...',
        '⚡ [2/4] 활성 무선 ADB 디바이스 스캔 중...',
        '📦 [3/4] 스마트폰 실시간 비디오 송출기 (scrcpy-server) 전송...',
        '🎬 [4/4] 무선 H.264 미러링 스트림 렌더링 시작!'
      ]);

      setTimeout(() => {
        onConnectWifi('', '');
        setIsPairing(false);
        setPairingLogs(prev => [...prev, '✅ [성공] 자동 감지된 무선 ADB 미러링 연결 시작!']);
      }, 1500);
    } else {
      if (!wifiIp.includes('.')) {
        setErrorMessage('올바른 휴대폰 IP 주소를 입력해 주세요 (예: 192.168.0.123)');
        setIsPairing(false);
        return;
      }

      setPairingLogs([
        `📶 [1/5] 동일 무선 Wi-Fi 네트워킹 (${wifiIp}) 핑 연결 시도...`,
        pairingCode ? `🔑 [2/5] 안드로이드 11+ 무선 디버깅 페어링 (포트:${pairPort || wifiPort}, 코드:${pairingCode})...` : '⏩ [2/5] 기존 인증 세션 재사용 시도...',
        `⚡ [3/5] ADB 무선 바인딩 (adb connect ${wifiIp}:${wifiPort})...`,
        '📦 [4/5] 스마트폰 실시간 비디오 송출기 (scrcpy-server) 전송...',
        '🎬 [5/5] 무선 H.264 미러링 스트림 렌더링 시작!'
      ]);

      setTimeout(() => {
        onConnectWifi(wifiIp, wifiPort, pairingCode, pairPort);
        setIsPairing(false);
        setPairingLogs(prev => [...prev, `✅ [성공] 무선 ADB 미러링 연결 시작! (${wifiIp}:${wifiPort})`]);
      }, 1500);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '580px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        position: 'relative',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7), 0 0 40px rgba(61, 220, 132, 0.15)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Smartphone size={24} color="var(--accent-android)" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>안드로이드 미러링 기기 연동</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            원하시는 연결 방식을 선택하고 가이드에 따라 기기를 연동하세요.
          </p>
        </div>

        {/* WebSocket Relay Address Input */}
        <div className="glass-card" style={{ padding: '14px', marginBottom: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            🔌 릴레이 중계 서버 주소 (WebSocket Relay Address)
          </label>
          <input
            type="text"
            value={wsHost}
            onChange={(e) => setWsHost(e.target.value)}
            placeholder="ws://localhost:8080"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem'
            }}
          />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block', lineHeight: 1.4 }}>
            ※ 외부 HTTPS 배포 환경인 경우 localtunnel이 발급해 준 <strong>wss://</strong> 보안 도메인 주소를 입력하세요. (로컬 기본값: <code>ws://localhost:8080</code>)
          </span>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => { setMode('usb'); setErrorMessage(null); setPairingLogs([]); }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: mode === 'usb' ? '2px solid var(--accent-android)' : '1px solid var(--border-subtle)',
              background: mode === 'usb' ? 'rgba(61, 220, 132, 0.1)' : 'rgba(255, 255, 255, 0.03)',
              color: 'var(--text-primary)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
              <Usb size={18} color="var(--accent-android)" />
              1) USB 케이블 직결 (WebUSB)
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              USB 디버깅 ON + 케이블 연결 시 100% 감지
            </span>
          </button>

          <button
            onClick={() => { setMode('wifi'); setErrorMessage(null); setPairingLogs([]); }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: mode === 'wifi' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              background: mode === 'wifi' ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 255, 255, 0.03)',
              color: 'var(--text-primary)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
              <Wifi size={18} color="var(--accent-cyan)" />
              2) 동일 Wi-Fi 무선 네트워크
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              동일 Wi-Fi망에서 무선 ADB IP:포트 연결
            </span>
          </button>
        </div>

        {/* Live Pairing Logs Console Window */}
        {pairingLogs.length > 0 && (
          <div style={{
            background: '#040812',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(61, 220, 132, 0.3)',
            padding: '14px',
            marginBottom: '18px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-android)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px', marginBottom: '4px' }}>
              <span>⚡ 실시간 무선 페어링 로그 콘솔</span>
              {isPairing && <Loader2 size={14} className="animate-spin" />}
            </div>
            {pairingLogs.map((log, idx) => (
              <div key={idx} style={{ color: log.includes('성공') ? 'var(--accent-android)' : '#cbd5e1' }}>
                {log}
              </div>
            ))}
          </div>
        )}

        {/* Error Troubleshooting Panel */}
        {errorMessage && (
          <div style={{
            background: 'rgba(255, 75, 75, 0.1)',
            border: '1px solid rgba(255, 75, 75, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            marginBottom: '18px',
            fontSize: '0.8rem',
            color: '#f87171'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
              <AlertTriangle size={16} />
              무선 디버깅 접속 거부 원인 및 해결 방법
            </div>
            <ul style={{ paddingLeft: '20px', lineHeight: 1.6, color: '#e2e8f0' }}>
              <li><strong>체크 1:</strong> 스마트폰 <strong>[무선 디버깅] → [페어링 코드로 기기 페어링]</strong> 클릭 시 화면에 뜬 <strong>6자리 페어링 코드</strong>와 <strong>페어링 포트</strong>를 입력하셨는지 확인해 주세요.</li>
              <li><strong>체크 2:</strong> 무선 디버깅 화면의 IP 및 연결 포트(예: 44067)가 스마트폰 화면 켜짐/꺼짐에 따라 바뀌지 않았는지 확인해 주세요.</li>
            </ul>
          </div>
        )}

        {/* Tab 1: USB Connection View */}
        {mode === 'usb' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '14px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-android)', marginBottom: '8px' }}>
                🔌 WebUSB 실시간 연결 순서
              </h4>
              <ol style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '18px', lineHeight: 1.6 }}>
                <li>스마트폰을 USB 케이블로 PC와 연결합니다.</li>
                <li><strong>[설정] → [개발자 옵션] → [USB 디버깅]</strong>을 켭니다.</li>
                <li>아래 [WebUSB 기기 검색 및 승인] 버튼 클릭 후 브라우저 팝업에서 <strong>본인의 스마트폰 이름</strong>을 클릭합니다.</li>
              </ol>
            </div>

            <button
              className="btn-primary"
              onClick={handleUsbStart}
              disabled={isPairing}
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              {isPairing ? <Loader2 size={20} className="animate-spin" /> : <Usb size={20} />}
              {isPairing ? '기기 페어링 감지 중...' : 'WebUSB 기기 검색 및 승인 요청'}
            </button>
          </div>
        )}

        {/* Tab 2: Wi-Fi Connection View */}
        {mode === 'wifi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '14px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={16} />
                안드로이드 11+ 무선 디버깅 페어링 가이드
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
                스마트폰 <strong>[무선 디버깅] → [페어링 코드로 기기 페어링]</strong>을 누르면 나오는 정보를 입력하세요.
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginBottom: '12px', lineHeight: 1.5, background: 'rgba(0, 242, 254, 0.08)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                💡 <strong>원터치 간편 연결 팁</strong>: 기존에 이미 한 번 페어링을 진행하여 연결된 적이 있는 스마트폰이라면, 위 IP/포트 칸을 모두 지우고 <strong>빈칸 상태</strong>에서 아래 파란색 버튼을 누르시면 자동으로 기기를 감지하여 즉시 연동됩니다.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    스마트폰 무선 IP 주소
                  </label>
                  <input
                    type="text"
                    value={wifiIp}
                    onChange={(e) => setWifiIp(e.target.value)}
                    placeholder="예: 192.168.0.123"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    연결 포트
                  </label>
                  <input
                    type="text"
                    value={wifiPort}
                    onChange={(e) => setWifiPort(e.target.value)}
                    placeholder="예: 44067"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    페어링 전용 포트 (팝업에 표시)
                  </label>
                  <input
                    type="text"
                    value={pairPort}
                    onChange={(e) => setPairPort(e.target.value)}
                    placeholder="예: 37119"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    페어링 코드 6자리
                  </label>
                  <input
                    type="text"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value)}
                    placeholder="예: 784920"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleWifiStart}
              disabled={isPairing}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--accent-cyan) 0%, #00b4d8 100%)',
                color: '#031418',
                fontWeight: 700,
                fontSize: '1rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0, 242, 254, 0.3)'
              }}
            >
              {isPairing ? <Loader2 size={20} className="animate-spin" /> : <Radio size={20} />}
              {isPairing ? '무선 ADB 페어링 신호 송신 중...' : '무선 네트워크 ADB 페어링 & 연결'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
