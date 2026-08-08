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
  ipAddress?: string;
  wsHost?: string;
  onJmuxerInit?: (jmuxer: any) => void;
  onSendKey?: (keyCode: number) => void;
  onSendText?: (text: string) => void;
}

export const MirrorCanvas: React.FC<MirrorCanvasProps> = ({
  status,
  mode,
  isLandscape,
  onSendTouch,
  onOpenConnectModal,
  videoStream,
  ipAddress,
  wsHost = 'ws://localhost:8080',
  onJmuxerInit,
  onSendKey,
  onSendText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const jmuxerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [touchRipples, setTouchRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isRealVideoPlaying, setIsRealVideoPlaying] = useState<boolean>(false);
  const [isPointerDownState, setIsPointerDownState] = useState<boolean>(false);

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
        clearBuffer: true,
        flushingTime: 50
      } as any);

      if (wsHost === 'webusb') {
        if (onJmuxerInit) onJmuxerInit(jmuxerRef.current);
        setIsRealVideoPlaying(true);
        return;
      }

      // Connect to WebSocket H.264 video stream from scrcpy-server
      const ws = new WebSocket(wsHost);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      let bytesReceived = 0;
      const HEADER_LENGTH = 12; // scrcpy 2.0+ metadata header is 12 bytes

      ws.onopen = () => {
        let ip = '';
        let port = '';
        if (ipAddress && ipAddress.includes(':')) {
          const parts = ipAddress.split(':');
          ip = parts[0];
          port = parts[1];
        }
        ws.send(JSON.stringify({ action: 'start_scrcpy', mode, ip, port }));
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          let uint8 = new Uint8Array(event.data);

          if (bytesReceived < HEADER_LENGTH) {
            const needed = HEADER_LENGTH - bytesReceived;
            if (uint8.length <= needed) {
              bytesReceived += uint8.length;
              return;
            } else {
              uint8 = uint8.subarray(needed);
              bytesReceived = HEADER_LENGTH;
              console.log(`[Scrcpy Decoder Engine] Skipped scrcpy 2.x metadata header (${HEADER_LENGTH} bytes). Feeding stream to JMuxer...`);
            }
          }

          if (jmuxerRef.current) {
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
        wsRef.current = null;
      };
    } catch (e) {
      console.warn('JMuxer init:', e);
    }
  }, [status, mode, videoStream, ipAddress]);

  // Keyboard & Mouse Scroll events wiring
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (status !== 'connected' || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const direction = e.deltaY > 0 ? 'down' : 'up';
    wsRef.current.send(JSON.stringify({ action: 'inject_scroll', direction }));
  };

  useEffect(() => {
    if (status !== 'connected') return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isWebUsb = wsHost === 'webusb';
      if (!isWebUsb && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) {
        return;
      }

      const hanToEngMap: Record<string, string> = {
        'ㅂ': 'q', 'ㅃ': 'Q', 'ㅈ': 'w', 'ㅉ': 'W', 'ㄷ': 'e', 'ㄸ': 'E', 'ㄱ': 'r', 'ㄲ': 'R', 'ㅅ': 't', 'ㅆ': 'T',
        'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅒ': 'O', 'ㅔ': 'p', 'ㅖ': 'P',
        'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g', 'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l',
        'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b', 'ㅜ': 'n', 'ㅡ': 'm'
      };

      const controlKeyMap: Record<string, number> = {
        Backspace: 67,
        Enter: 66,
        Tab: 61,
        Escape: 111,
        ArrowUp: 19,
        ArrowDown: 20,
        ArrowLeft: 21,
        ArrowRight: 22,
      };

      const key = e.key;

      if (controlKeyMap[key]) {
        e.preventDefault();
        if (isWebUsb) {
          if (onSendKey) onSendKey(controlKeyMap[key]);
        } else {
          wsRef.current?.send(JSON.stringify({ action: 'inject_key', keyCode: controlKeyMap[key] }));
        }
      } else if (hanToEngMap[key]) {
        if (isWebUsb) {
          if (onSendText) onSendText(hanToEngMap[key]);
        } else {
          wsRef.current?.send(JSON.stringify({ action: 'inject_text', text: hanToEngMap[key] }));
        }
      } else if (key.length === 1) {
        if (isWebUsb) {
          if (onSendText) onSendText(key);
        } else {
          wsRef.current?.send(JSON.stringify({ action: 'inject_text', text: key }));
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [status, wsHost]);

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

          // RAF-based hyper-precise live buffer lag sync loop
          if (video.buffered && video.buffered.length > 0) {
            const bufferEnd = video.buffered.end(video.buffered.length - 1);
            const delay = bufferEnd - video.currentTime;

            if (delay > 0.3) {
              video.currentTime = bufferEnd - 0.03;
              video.playbackRate = 1.0;
            } else if (delay > 0.08) {
              video.playbackRate = 1.4;
            } else {
              video.playbackRate = 1.0;
            }
          }
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
    setIsPointerDownState(true);
    try {
      containerRef.current.setPointerCapture(e.pointerId);
    } catch (err) {}

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

    const video = videoRef.current;
    const width = video && video.videoWidth > 0 ? video.videoWidth : 1080;
    const height = video && video.videoHeight > 0 ? video.videoHeight : 2400;

    // Send touch event to ADB handler
    onSendTouch({
      type: 'down',
      xRatio,
      yRatio,
      width,
      height,
      pointerId: e.pointerId
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownState || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xRatio = Math.max(0, Math.min(1, x / rect.width));
    const yRatio = Math.max(0, Math.min(1, y / rect.height));

    const video = videoRef.current;
    const width = video && video.videoWidth > 0 ? video.videoWidth : 1080;
    const height = video && video.videoHeight > 0 ? video.videoHeight : 2400;

    onSendTouch({
      type: 'move',
      xRatio,
      yRatio,
      width,
      height,
      pointerId: e.pointerId
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownState || !containerRef.current) return;
    setIsPointerDownState(false);
    try {
      containerRef.current.releasePointerCapture(e.pointerId);
    } catch (err) {}

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xRatio = Math.max(0, Math.min(1, x / rect.width));
    const yRatio = Math.max(0, Math.min(1, y / rect.height));

    const video = videoRef.current;
    const width = video && video.videoWidth > 0 ? video.videoWidth : 1080;
    const height = video && video.videoHeight > 0 ? video.videoHeight : 2400;

    onSendTouch({
      type: 'up',
      xRatio,
      yRatio,
      width,
      height,
      pointerId: e.pointerId
    });
  };

  return (
    <div 
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1
        }}
      />

      <canvas
        ref={canvasRef}
        width={isLandscape ? 1280 : 720}
        height={isLandscape ? 720 : 1480}
        onWheel={handleWheel}
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
