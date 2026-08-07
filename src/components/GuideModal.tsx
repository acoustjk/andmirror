import React from 'react';
import { X, HelpCircle } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
        position: 'relative'
      }}>
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
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <HelpCircle size={24} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>안드로이드 연결 가이드</h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          스마트폰 화면을 웹 브라우저로 전송받기 위해 필요한 개발자 옵션 설정 단계입니다.
        </p>

        {/* Step 1 */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-android)', marginBottom: '8px' }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--accent-android)',
              color: '#07160c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>1</span>
            개발자 옵션 활성화하기
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            스마트폰 <strong>[설정] → [휴대전화 정보] → [소프트웨어 정보]</strong> 메뉴로 이동한 뒤, <strong>[빌드번호]</strong>를 연속 7번 빠르게 터치하세요. <i>"개발자 모드를 켰습니다"</i> 안내가 표시됩니다.
          </p>
        </div>

        {/* Step 2 */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--accent-cyan)',
              color: '#041619',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>2</span>
            USB 디버깅 켜기 (USB 미러링 방식)
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            스마트폰 <strong>[설정] 맨 아래 생성된 [개발자 옵션]</strong>에 들어간 뒤 <strong>[USB 디버깅]</strong> 항목을 켜세요. 케이블 연결 후 PC에서 접근 요청 시 [허용]을 선택합니다.
          </p>
        </div>

        {/* Step 3 */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-purple)', marginBottom: '8px' }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--accent-purple)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>3</span>
            무선 디버깅 켜기 (동일 Wi-Fi 무선 미러링)
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            안드로이드 11 이상 기기는 <strong>[개발자 옵션] → [무선 디버깅]</strong>을 활성화하고, PC와 동일한 Wi-Fi 망에 접속한 상태에서 로컬 IP(`192.168.x.x:5555`)로 무선 미러링이 가능합니다.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={onClose}
          style={{ width: '100%', padding: '12px' }}
        >
          가이드 확인 완료
        </button>
      </div>
    </div>
  );
};
