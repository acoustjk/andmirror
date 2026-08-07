import React, { useState } from 'react';
import { UploadCloud, FileCode, X } from 'lucide-react';

interface FileTransferPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FileTransferPanel: React.FC<FileTransferPanelProps> = ({ isOpen, onClose }) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [transfers, setTransfers] = useState<Array<{ name: string; size: string; progress: number; status: 'uploading' | 'completed' }>>([]);

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    files.forEach(file => {
      const newTransfer = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        progress: 10,
        status: 'uploading' as const
      };

      setTransfers(prev => [...prev, newTransfer]);

      // Simulate ADB upload progress
      let currentProgress = 10;
      const interval = setInterval(() => {
        currentProgress += 20;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setTransfers(prev => prev.map(t => t.name === file.name ? { ...t, progress: 100, status: 'completed' } : t));
        } else {
          setTransfers(prev => prev.map(t => t.name === file.name ? { ...t, progress: currentProgress } : t));
        }
      }, 300);
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 8, 15, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '520px',
        padding: '24px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
          📂 파일 &amp; APK 드래그 앤 드롭 전송
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          APK 파일을 드래그하여 스마트폰에 직접 설치하거나, 사진/문서 파일 전송을 진행하세요.
        </p>

        {/* Drag Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            padding: '36px 20px',
            borderRadius: 'var(--radius-md)',
            border: `2px dashed ${isDragging ? 'var(--accent-android)' : 'var(--border-subtle)'}`,
            background: isDragging ? 'rgba(61, 220, 132, 0.1)' : 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '20px'
          }}
        >
          <UploadCloud size={40} color={isDragging ? 'var(--accent-android)' : 'var(--accent-purple)'} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>이곳에 파일/APK를 끌어다 놓으세요</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>또는 클릭하여 PC 파일 선택 (최대 2GB)</div>
          </div>
        </div>

        {/* Transfers Progress List */}
        {transfers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              최근 파일 전송 기록 ({transfers.length})
            </h4>
            {transfers.map((t, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <FileCode size={16} color="var(--accent-cyan)" />
                    <span>{t.name}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.size}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${t.progress}%`, height: '100%', background: 'var(--accent-android)', transition: 'width 0.2s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: t.status === 'completed' ? 'var(--accent-android)' : 'var(--accent-cyan)' }}>
                    {t.status === 'completed' ? '설치/전송 완료' : `${t.progress}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
