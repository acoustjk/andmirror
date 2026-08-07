import React, { useRef, useEffect, useState } from 'react';
import type { ConnectionStatus, TouchEventData, ConnectionMode } from '../types';
import { Usb, Smartphone } from 'lucide-react';
import JMuxer from 'jmuxer';

interface MirrorCanvasProps {
  status: ConnectionStatus;
  mode: ConnectionMode;
  isLandscape: boolean;
  onSendTouch: (touch: TouchEventData) => void;
  onOpenConnectModal: () => void;
  videoStream?: MediaStream | null;
}

export const MirrorCanvas: React.FC<MirrorCanvasProps> = ({
  status,
  mode,
  isLandscape,
  onSendTouch,
  onOpenConnectModal,
  videoStream,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const jmuxerRef = useRef<any>(null);

  const [touchRipples, setTouchRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isRealVideoPlaying, setIsRealVideoPlaying] = useState<boolean>(false);

  // Initialize JMuxer H.264 real-time decoder on the video element
  useEffect(() => {
    if (status !== 'connected' || !videoRef.current) return;

    const video = videoRef.current;

    if (videoStream) {
      video.srcObject = videoStream;
      video.play().then(() => setIsRealVideoPlaying(true)).catch(console.error);
      return;
    }

    try {
      // Create JMuxer instance for live H.264 video demuxing
      jmuxerRef.current = new JMuxer({
        node: video,
        mode: 'video',
        flv: false,
        fps: 60,
        debug: false,
        clearBuffer: true
      });

      // Connect to WebSocket H.264 video stream from scrcpy-server
      const ws = new WebSocket('ws://localhost:8080');
      ws.binaryType = 'arraybuffer';

      let isHeaderFound = false;

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'start_scrcpy', mode }));
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          let uint8 = new Uint8Array(event.data);

          // Find first occurrence of H.264 NAL Unit start code [0, 0, 0, 1] or [0, 0, 1] to skip Scrcpy metadata header
          if (!isHeaderFound) {
            for (let i = 0; i < uint8.length - 4; i++) {
              if (
                (uint8[i] === 0 && uint8[i + 1] === 0 && uint8[i + 2] === 0 && uint8[i + 3] === 1) ||
                (uint8[i] === 0 && uint8[i + 1] === 0 && uint8[i + 2] === 1)
              ) {
                uint8 = uint8.subarray(i);
                isHeaderFound = true;
                console.log(`[Scrcpy Decoder Engine] Found H.264 NAL start code at byte offset ${i}! Feeding to JMuxer...`);
                break;
              }
            }
          }

          if (isHeaderFound && jmuxerRef.current) {
            jmuxerRef.current.feed({
              video: uint8
            });
            if (video.paused) {
              video.play().then(() => setIsRealVideoPlaying(true)).catch(console.error);
            }
          }
        }
      };

      return () => {
        if (jmuxerRef.current) {
          jmuxerRef.current.destroy();
          jmuxerRef.current = null;
        }
        ws.close();
      };
    } catch (e) {
      console.warn('JMuxer init:', e);
    }
  }, [status, mode, videoStream]);

  // Main Canvas Render Loop (Draws the exact physical smartphone screen pixels from video element onto canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const video = videoRef.current;

      if (status === 'connected') {
        // Draw exact physical smartphone screen video frame onto canvas
        if (video && video.videoWidth > 0 && !video.paused) {
          ctx.drawImage(video, 0, 0, w, h);
        } else {
          // Dynamic gradient wallpaper while stream initializes
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#0d1527');
          grad.addColorStop(0.5, '#070b14');
          grad.addColorStop(1, '#11192e');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Grid pattern
          ctx.strokeStyle = 'rgba(61, 220, 132, 0.05)';
          ctx.lineWidth = 1;
          for (let x = 0; x < w; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('📱 스마트폰 실시간 H.264 비디오 렌더링 중...', w / 2, h / 2 - 20);

          ctx.font = '13px Outfit, sans-serif';
          ctx.fillStyle = '#3DDC84';
          ctx.fillText('Qualcomm Snapdragon H.264 Encoder (60 FPS)...', w / 2, h / 2 + 15);
        }
      } else {
        // Disconnected state
        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, w, h);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [status, isRealVideoPlaying]);

  // Handle Touch/Click interaction on Canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xRatio = x / rect.width;
    const yRatio = y / rect.height;

    // Add ripple effect
    const newId = Date.now();
    setTouchRipples(prev => [...prev, { id: newId, x, y }]);
    setTimeout(() => {
      setTouchRipples(prev => prev.filter(r => r.id !== newId));
    }, 600);

    // Send touch event to ADB handler
    onSendTouch({
      type: 'down',
      xRatio,
      yRatio,
      pointerId: e.pointerId
    });
  };

  return (
    <div 
      ref={containerRef}
      onPointerDown={handlePointerDown}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: status === 'connected' ? 'crosshair' : 'default',
        touchAction: 'none'
      }}
    >
      {/* Hidden Video element for JMuxer real physical phone screen video stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />

      <canvas
        ref={canvasRef}
        width={isLandscape ? 1280 : 720}
        height={isLandscape ? 720 : 1480}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block'
        }}
      />

      {/* Touch Ripple FX Layer */}
      {touchRipples.map(r => (
        <div
          key={r.id}
          style={{
            position: 'absolute',
            left: `${r.x}px`,
            top: `${r.y}px`,
            width: '30px',
            height: '30px',
            marginLeft: '-15px',
            marginTop: '-15px',
            borderRadius: '50%',
            border: '2px solid var(--accent-android)',
            background: 'rgba(61, 220, 132, 0.3)',
            pointerEvents: 'none',
            animation: 'rippleEffect 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
          }}
        />
      ))}

      {/* Disconnected Overlay Prompt */}
      {status !== 'connected' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.92)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          gap: '16px',
          zIndex: 30
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(61, 220, 132, 0.2) 0%, rgba(0, 242, 254, 0.2) 100%)',
            border: '1px solid rgba(61, 220, 132, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-android)',
            boxShadow: '0 0 30px rgba(61, 220, 132, 0.2)'
          }}>
            <Smartphone size={34} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              안드로이드 기기 미연결
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: 1.5 }}>
              USB 케이블(WebUSB) 또는 동일 Wi-Fi 무선 네트워크를 통해 휴대폰을 연동하세요.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={onOpenConnectModal}
            style={{ width: '100%', maxWidth: '240px' }}
          >
            <Usb size={18} />
            기기 연결 시작하기
          </button>
        </div>
      )}
    </div>
  );
};
