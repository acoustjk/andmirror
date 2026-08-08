import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import localtunnel from 'localtunnel';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const relayPath = path.join(__dirname, 'relay.js');

console.log('[Tunnel Deployer] Starting local relay server...');
const relayProcess = fork(relayPath);

relayProcess.on('error', (err) => {
  console.error('[Tunnel Deployer] Relay server crashed:', err);
});

(async () => {
  try {
    console.log('[Tunnel Deployer] Launching localtunnel on port 8080...');
    const tunnel = await localtunnel({ port: 8080 });
    
    // Convert https://... to wss://...
    const wssUrl = tunnel.url.replace(/^http/, 'ws');
    console.log('\n======================================================');
    console.log('🚀 [DEPLOY SUCCESS] AndMirror Cloud Tunnel is Live!');
    console.log(`🔗 HTTP Web Host Address: ${tunnel.url}`);
    console.log(`🔐 WSS Secure Socket Address: ${wssUrl}`);
    console.log('======================================================\n');
    console.log('💡 외부 HTTPS 웹페이지로 접속하여 위 WSS 주소를 기입해 연결하세요!');

    tunnel.on('close', () => {
      console.log('[Tunnel Deployer] Tunnel closed.');
      relayProcess.kill();
      process.exit(0);
    });
  } catch (err) {
    console.error('[Tunnel Deployer] Failed to open localtunnel:', err.message);
  }
})();

process.on('SIGINT', () => {
  relayProcess.kill();
  process.exit(0);
});
