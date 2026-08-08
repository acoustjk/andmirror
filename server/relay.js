import { WebSocketServer } from 'ws';
import net from 'net';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import { fileURLToPath } from 'url';
import fs from 'fs';

const execAsync = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let activeUploadStreams = new Map();

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });
const scrcpyServerPath = path.join(__dirname, 'scrcpy-server');
const adbExePath = path.join(__dirname, 'tools', 'platform-tools', 'adb.exe');

console.log(`[DroidMirror Engine] Portable ADB Path: ${adbExePath}`);
console.log(`[DroidMirror Engine] Listening on ws://localhost:${PORT}`);

let cachedDeviceResolution = null;

function createInjectTextBuffer(text) {
  const textBytes = Buffer.from(text, 'utf-8');
  const buffer = Buffer.alloc(1 + 4 + textBytes.length);
  buffer.writeUInt8(1, 0); // Control message type: 1 (inject text)
  buffer.writeUInt32BE(textBytes.length, 1); // text length
  textBytes.copy(buffer, 5); // copy text
  return buffer;
}

function createInjectKeyBuffer(action, keyCode, metastate = 0) {
  const buffer = Buffer.alloc(1 + 1 + 4 + 4 + 4);
  buffer.writeUInt8(0, 0); // Control message type: 0 (inject keyevent)
  buffer.writeUInt8(action, 1); // 0 = Down, 1 = Up
  buffer.writeUInt32BE(keyCode, 2); // Android KeyCode
  buffer.writeUInt32BE(0, 6); // repeat count: 0 (4 bytes)
  buffer.writeUInt32BE(metastate, 10); // meta state (4 bytes)
  return buffer;
}

let globalDeviceFlag = '';
let globalControlSocket = null;

wss.on('connection', (ws) => {
  console.log('[Relay] Browser Client connected');
  let videoSocket = null;
  let controlSocket = null;
  let scrcpyProcess = null;

  ws.on('message', async (message) => {
    try {
      if (typeof message === 'string' || (message instanceof Buffer && message.length < 500 && message.toString().startsWith('{'))) {
        const payload = JSON.parse(message.toString());

        let targetIp = (payload.ip || '').trim();
        let targetPort = (payload.port || '').trim();
        const mode = payload.mode || 'wifi';
        const pairCode = payload.pairingCode ? payload.pairingCode.trim() : '';
        const pairPort = payload.pairPort ? payload.pairPort.trim() : '';

        let usbDeviceSerial = '';

        // Auto-detect wireless device or USB serial
        if (payload.action && payload.action !== 'connect') {
          if (mode === 'wifi' && !targetIp) {
            try {
              const devicesRes = await execAsync(`"${adbExePath}" devices`);
              const lines = devicesRes.stdout.split('\n');
              const wifiDevices = [];
              for (const line of lines) {
                if (line.includes('\tdevice')) {
                  const dev = line.split('\t')[0].trim();
                  if (dev.includes(':')) wifiDevices.push(dev);
                }
              }
              if (wifiDevices.length > 0) {
                const parts = wifiDevices[0].split(':');
                targetIp = parts[0];
                targetPort = parts[1];
              }
            } catch (err) {
              console.error('[Relay] WiFi Auto-detect failed:', err.message);
            }
          } else if (mode === 'usb') {
            try {
              const devicesRes = await execAsync(`"${adbExePath}" devices`);
              const lines = devicesRes.stdout.split('\n');
              for (const line of lines) {
                if (line.includes('\tdevice')) {
                  const dev = line.split('\t')[0].trim();
                  if (!dev.includes(':')) {
                    usbDeviceSerial = dev;
                    break;
                  }
                }
              }
              console.log(`[Relay USB] Auto-detected USB device serial: ${usbDeviceSerial || 'N/A'}`);
            } catch (err) {
              console.error('[Relay] USB Auto-detect failed:', err.message);
            }
          }
        }

        if (mode === 'wifi') {
          if (!targetIp) targetIp = '192.168.0.123';
          if (!targetPort) targetPort = '44067';
        }

        const targetDevice = mode === 'wifi' ? `${targetIp}:${targetPort}` : usbDeviceSerial;
        const pairDevice = mode === 'wifi' && pairPort ? `${targetIp}:${pairPort}` : targetDevice;
        const deviceFlag = targetDevice ? `-s ${targetDevice}` : '';

        if (payload.action === 'connect') {
          console.log(`[Relay Pipeline - Connect] IP: ${targetIp}, ConnectPort: ${targetPort}, PairPort: ${pairPort || 'N/A'}, Code: ${pairCode || 'N/A'}`);
          try {
            if (pairCode && pairDevice) {
              console.log(`[ADB Pair] Pairing ADB: "${adbExePath}" pair ${pairDevice} ${pairCode}...`);
              const pairRes = await execAsync(`"${adbExePath}" pair ${pairDevice} ${pairCode}`).catch(e => ({ stdout: e.message }));
              console.log(`[ADB Pair Output] ${pairRes.stdout?.trim()}`);
            }

            if (targetDevice) {
              console.log(`[ADB Connect] Connecting ADB: "${adbExePath}" connect ${targetDevice}...`);
              const connRes = await execAsync(`"${adbExePath}" connect ${targetDevice}`).catch(e => ({ stdout: e.message }));
              console.log(`[ADB Connect Output] ${connRes.stdout?.trim()}`);
            }

            globalDeviceFlag = deviceFlag;
            ws.send(JSON.stringify({ status: 'connected', mode }));
          } catch (pipelineErr) {
            console.error('[Pipeline Connect Error]', pipelineErr.message);
            ws.send(JSON.stringify({ status: 'error', message: pipelineErr.message }));
          }
        } else if (payload.action === 'start_scrcpy') {
          console.log(`[Relay Pipeline - Stream] IP: ${targetIp}, ConnectPort: ${targetPort}`);
          try {
            console.log(`[Step 1/3] Pushing Scrcpy Server to phone...`);
            const pushRes = await execAsync(`"${adbExePath}" ${deviceFlag} push "${scrcpyServerPath}" /data/local/tmp/scrcpy-server.jar`).catch(e => ({ stdout: e.message }));
            console.log(`[Push Output] ${pushRes.stdout?.trim()}`);

            console.log(`[Step 2/3] Forwarding Socket Port 6900...`);
            const fwdRes = await execAsync(`"${adbExePath}" ${deviceFlag} forward tcp:6900 localabstract:scrcpy`).catch(e => ({ stdout: e.message }));
            console.log(`[Forward Output] ${fwdRes.stdout?.trim()}`);

            const scrcpyCmd = `"${adbExePath}" ${deviceFlag} shell CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server 2.4 tunnel_forward=true video=true audio=false control=true max_size=1080 video_bit_rate=4000000 max_fps=60`;
            console.log(`[Step 3/3] Launching Scrcpy Server: ${scrcpyCmd}`);
            scrcpyProcess = exec(scrcpyCmd);

            scrcpyProcess.stdout.on('data', (d) => console.log(`[Scrcpy Server Log] ${d.toString().trim()}`));
            scrcpyProcess.stderr.on('data', (d) => console.log(`[Scrcpy Server Log] ${d.toString().trim()}`));

            setTimeout(() => {
              videoSocket = net.createConnection({ host: '127.0.0.1', port: 6900 }, () => {
                console.log('✅ [SUCCESS] Connected to Real Device Scrcpy Video Socket (Port 6900)!');

                controlSocket = net.createConnection({ host: '127.0.0.1', port: 6900 }, () => {
                  console.log('✅ [SUCCESS] Connected to Real Device Scrcpy Control Socket (Port 6900)!');
                  globalDeviceFlag = deviceFlag;
                  globalControlSocket = controlSocket;
                  ws.send(JSON.stringify({ status: 'connected', mode, realStream: true }));
                });

                controlSocket.on('error', (cErr) => {
                  console.error('[Control Socket Error]', cErr.message);
                });

                controlSocket.on('close', () => {
                  console.log('[Control Socket] Closed');
                });
              });

              let chunkCount = 0;
              let totalBytes = 0;
              videoSocket.on('data', (chunk) => {
                if (ws.readyState === ws.OPEN) {
                  chunkCount++;
                  totalBytes += chunk.length;
                  if (chunkCount % 50 === 0 || chunkCount < 5) {
                    console.log(`[Relay Proxy] Forwarded chunk #${chunkCount}, size: ${chunk.length} bytes, total: ${totalBytes} bytes`);
                  }
                  ws.send(chunk);
                }
              });

              videoSocket.on('error', (vErr) => {
                console.error('[Video Socket Error]', vErr.message);
              });

              videoSocket.on('close', () => {
                console.log('[Video Socket] Closed');
              });
            }, 1200);
          } catch (pipelineErr) {
            console.error('[Pipeline Stream Error]', pipelineErr.message);
          }
        } else if (payload.action === 'inject_touch') {
          const xRatio = payload.xRatio || 0;
          const yRatio = payload.yRatio || 0;

          (async () => {
            try {
              if (!cachedDeviceResolution) {
                const sizeRes = await execAsync(`"${adbExePath}" ${globalDeviceFlag} shell wm size`);
                const match = sizeRes.stdout.match(/(\d+)x(\d+)/);
                if (match) {
                  cachedDeviceResolution = {
                    width: parseInt(match[1], 10),
                    height: parseInt(match[2], 10)
                  };
                }
              }
              const width = cachedDeviceResolution ? cachedDeviceResolution.width : 1080;
              const height = cachedDeviceResolution ? cachedDeviceResolution.height : 2400;
              const x = Math.floor(xRatio * width);
              const y = Math.floor(yRatio * height);

              console.log(`[Relay Input] Injecting Touch: ratio(${xRatio.toFixed(3)}, ${yRatio.toFixed(3)}) -> real(${x}, ${y}) on ${globalDeviceFlag}`);
              await execAsync(`"${adbExePath}" ${globalDeviceFlag} shell input tap ${x} ${y}`);
            } catch (err) {
              console.error('[Relay Input Error] Failed to inject touch:', err.message);
            }
          })();
        } else if (payload.action === 'inject_scroll') {
          const direction = payload.direction || 'down';

          (async () => {
            try {
              if (!cachedDeviceResolution) {
                const sizeRes = await execAsync(`"${adbExePath}" ${globalDeviceFlag} shell wm size`);
                const match = sizeRes.stdout.match(/(\d+)x(\d+)/);
                if (match) {
                  cachedDeviceResolution = {
                    width: parseInt(match[1], 10),
                    height: parseInt(match[2], 10)
                  };
                }
              }
              const width = cachedDeviceResolution ? cachedDeviceResolution.width : 1080;
              const height = cachedDeviceResolution ? cachedDeviceResolution.height : 2400;

              const x_mid = Math.floor(width / 2);
              let x1 = x_mid, y1 = 0, x2 = x_mid, y2 = 0;

              if (direction === 'down') {
                y1 = Math.floor(height * 0.7);
                y2 = Math.floor(height * 0.3);
              } else {
                y1 = Math.floor(height * 0.3);
                y2 = Math.floor(height * 0.7);
              }

              console.log(`[Relay Input] Injecting Scroll: direction(${direction}) on ${globalDeviceFlag}`);
              await execAsync(`"${adbExePath}" ${globalDeviceFlag} shell input swipe ${x1} ${y1} ${x2} ${y2} 200`);
            } catch (err) {
              console.error('[Relay Input Error] Failed to inject scroll:', err.message);
            }
          })();
        } else if (payload.action === 'inject_text') {
          const rawText = payload.text || '';
          if (globalControlSocket && !globalControlSocket.destroyed) {
            console.log(`[Relay Input] Injecting Text via Control Socket: "${rawText}"`);
            globalControlSocket.write(createInjectTextBuffer(rawText));
          } else {
            const escapedText = rawText.replace(/ /g, '%s').replace(/["'()&|<>;]/g, '\\$&');
            execAsync(`"${adbExePath}" ${globalDeviceFlag} shell input text "${escapedText}"`).catch(() => {});
          }
        } else if (payload.action === 'inject_key') {
          const keyCode = payload.keyCode || 3;
          const isSystemKey = [3, 4, 187, 26, 24, 25, 82].includes(keyCode);

          if (globalControlSocket && !globalControlSocket.destroyed && !isSystemKey) {
            console.log(`[Relay Input] Injecting Key via Control Socket: KEYCODE_${keyCode}`);
            globalControlSocket.write(createInjectKeyBuffer(0, keyCode)); // Down
            globalControlSocket.write(createInjectKeyBuffer(1, keyCode)); // Up
          } else {
            console.log(`[Relay Input] Injecting System Key via Shell: KEYCODE_${keyCode} on ${globalDeviceFlag}`);
            execAsync(`"${adbExePath}" ${globalDeviceFlag} shell input keyevent ${keyCode}`).catch(() => {});
          }
        } else if (payload.action === 'upload_start') {
          const { fileName } = payload;
          const tempDir = path.join(__dirname, 'temp_uploads');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          const filePath = path.join(tempDir, fileName);
          const writeStream = fs.createWriteStream(filePath);
          activeUploadStreams.set(fileName, { writeStream, filePath });
          console.log(`[Relay File] Start uploading file: ${fileName} to temp store`);
        } else if (payload.action === 'upload_chunk') {
          const { fileName, chunk } = payload;
          const uploadInfo = activeUploadStreams.get(fileName);
          if (uploadInfo) {
            const buffer = Buffer.from(chunk, 'base64');
            uploadInfo.writeStream.write(buffer);
          }
        } else if (payload.action === 'upload_end') {
          const { fileName } = payload;
          const uploadInfo = activeUploadStreams.get(fileName);
          if (uploadInfo) {
            uploadInfo.writeStream.end(async () => {
              activeUploadStreams.delete(fileName);
              console.log(`[Relay File] Uploaded successfully to backend: ${fileName}`);
              const isApk = fileName.toLowerCase().endsWith('.apk');
              try {
                if (isApk) {
                  console.log(`[Relay File] Install APK on device: ${fileName} using ${globalDeviceFlag}`);
                  ws.send(JSON.stringify({ action: 'upload_status', fileName, status: 'installing', progress: 95 }));
                  await execAsync(`"${adbExePath}" ${globalDeviceFlag} install -r "${uploadInfo.filePath}"`);
                  console.log(`[Relay File] APK installation success: ${fileName}`);
                } else {
                  console.log(`[Relay File] Push file to device: ${fileName} using ${globalDeviceFlag}`);
                  ws.send(JSON.stringify({ action: 'upload_status', fileName, status: 'pushing', progress: 95 }));
                  const remotePath = `/sdcard/Download/${fileName}`;
                  await execAsync(`"${adbExePath}" ${globalDeviceFlag} push "${uploadInfo.filePath}" "${remotePath}"`);
                  console.log(`[Relay File] Push file success: ${fileName} to ${remotePath}`);
                }
                
                if (fs.existsSync(uploadInfo.filePath)) {
                  fs.unlinkSync(uploadInfo.filePath);
                }
                ws.send(JSON.stringify({ action: 'upload_status', fileName, status: 'completed', progress: 100 }));
              } catch (adbErr) {
                console.error('[Relay File Error] ADB push/install failed:', adbErr.message);
                ws.send(JSON.stringify({ action: 'upload_status', fileName, status: 'error', message: adbErr.message }));
                if (fs.existsSync(uploadInfo.filePath)) {
                  fs.unlinkSync(uploadInfo.filePath);
                }
              }
            });
          }
        }
      } else {
        if (globalControlSocket && !globalControlSocket.destroyed) {
          globalControlSocket.write(message);
        }
      }
    } catch (e) {
      if (globalControlSocket && !globalControlSocket.destroyed) {
        globalControlSocket.write(message);
      }
    }
  });

  ws.on('close', () => {
    console.log('[Relay] Browser Client disconnected');
    if (videoSocket) videoSocket.destroy();
    if (controlSocket) {
      controlSocket.destroy();
      if (globalControlSocket === controlSocket) {
        globalControlSocket = null;
      }
    }
    if (scrcpyProcess) scrcpyProcess.kill();
  });
});
