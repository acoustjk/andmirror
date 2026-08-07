import { WebSocketServer } from 'ws';
import net from 'net';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import { fileURLToPath } from 'url';

const execAsync = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });
const scrcpyServerPath = path.join(__dirname, 'scrcpy-server');
const adbExePath = path.join(__dirname, 'tools', 'platform-tools', 'adb.exe');

console.log(`[DroidMirror Engine] Portable ADB Path: ${adbExePath}`);
console.log(`[DroidMirror Engine] Listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('[Relay] Browser Client connected');
  let videoSocket = null;
  let scrcpyProcess = null;

  ws.on('message', async (message) => {
    try {
      if (typeof message === 'string' || (message instanceof Buffer && message.length < 500 && message.toString().startsWith('{'))) {
        const payload = JSON.parse(message.toString());

        if (payload.action === 'connect' || payload.action === 'start_scrcpy') {
          const targetIp = (payload.ip || '192.168.0.123').trim();
          const targetPort = (payload.port || '44067').trim();
          const mode = payload.mode || 'wifi';
          const pairCode = payload.pairingCode ? payload.pairingCode.trim() : '';
          const pairPort = payload.pairPort ? payload.pairPort.trim() : '';

          console.log(`[Relay Pipeline] IP: ${targetIp}, ConnectPort: ${targetPort}, PairPort: ${pairPort || 'N/A'}, Code: ${pairCode || 'N/A'}`);

          const targetDevice = mode === 'wifi' ? `${targetIp}:${targetPort}` : '';
          const pairDevice = mode === 'wifi' && pairPort ? `${targetIp}:${pairPort}` : targetDevice;
          const deviceFlag = targetDevice ? `-s ${targetDevice}` : '';

          try {
            // Step 1: Pair if pairing code provided
            if (pairCode && pairDevice) {
              console.log(`[Step 1/5] Pairing ADB: "${adbExePath}" pair ${pairDevice} ${pairCode}...`);
              const pairRes = await execAsync(`"${adbExePath}" pair ${pairDevice} ${pairCode}`).catch(e => ({ stdout: e.message }));
              console.log(`[ADB Pair Output] ${pairRes.stdout?.trim()}`);
            }

            // Step 2: ADB Connect
            if (targetDevice) {
              console.log(`[Step 2/5] Connecting ADB: "${adbExePath}" connect ${targetDevice}...`);
              const connRes = await execAsync(`"${adbExePath}" connect ${targetDevice}`).catch(e => ({ stdout: e.message }));
              console.log(`[ADB Connect Output] ${connRes.stdout?.trim()}`);
            }

            // Step 3: Push scrcpy-server
            console.log(`[Step 3/5] Pushing Scrcpy Server to phone...`);
            const pushRes = await execAsync(`"${adbExePath}" ${deviceFlag} push "${scrcpyServerPath}" /data/local/tmp/scrcpy-server.jar`).catch(e => ({ stdout: e.message }));
            console.log(`[Push Output] ${pushRes.stdout?.trim()}`);

            // Step 4: Forward socket port 6900
            console.log(`[Step 4/5] Forwarding Socket Port 6900...`);
            const fwdRes = await execAsync(`"${adbExePath}" ${deviceFlag} forward tcp:6900 localabstract:scrcpy`).catch(e => ({ stdout: e.message }));
            console.log(`[Forward Output] ${fwdRes.stdout?.trim()}`);

            // Step 5: Launch scrcpy-server process on phone with scrcpy 2.4 arguments
            const scrcpyCmd = `"${adbExePath}" ${deviceFlag} shell CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server 2.4 tunnel_forward=true video=true audio=false control=true max_size=1080 video_bit_rate=8000000 max_fps=60`;
            console.log(`[Step 5/5] Launching Scrcpy Server: ${scrcpyCmd}`);
            scrcpyProcess = exec(scrcpyCmd);

            scrcpyProcess.stdout.on('data', (d) => console.log(`[Scrcpy Server Log] ${d.toString().trim()}`));
            scrcpyProcess.stderr.on('data', (d) => console.log(`[Scrcpy Server Log] ${d.toString().trim()}`));

            // Connect TCP socket to read H.264 video stream after 1200ms startup delay
            setTimeout(() => {
              videoSocket = net.createConnection({ host: '127.0.0.1', port: 6900 }, () => {
                console.log('✅ [SUCCESS] Connected to Real Device Scrcpy H.264 Stream Socket (Port 6900)!');
                ws.send(JSON.stringify({ status: 'connected', mode, realStream: true }));
              });

              videoSocket.on('data', (chunk) => {
                if (ws.readyState === ws.OPEN) {
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
            console.error('[Pipeline Error]', pipelineErr.message);
          }
        }
      } else {
        if (videoSocket && !videoSocket.destroyed) {
          videoSocket.write(message);
        }
      }
    } catch (e) {
      if (videoSocket && !videoSocket.destroyed) {
        videoSocket.write(message);
      }
    }
  });

  ws.on('close', () => {
    console.log('[Relay] Browser Client disconnected');
    if (videoSocket) videoSocket.destroy();
    if (scrcpyProcess) scrcpyProcess.kill();
  });
});
