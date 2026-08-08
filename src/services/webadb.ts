import { Adb, AdbDaemonTransport, ADB_DEFAULT_AUTHENTICATORS } from '@yume-chan/adb';
import { AdbWebUsbBackendManager } from '@yume-chan/adb-backend-webusb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';
import { Consumable, ReadableStream } from '@yume-chan/stream-extra';

export class ServerlessWebAdb {
  private adb: Adb | null = null;
  private serverProcess: any = null;
  private videoSocket: any = null;
  private controlSocket: any = null;
  
  private onVideoDataCallback: ((data: Uint8Array) => void) | null = null;
  private isConnected = false;

  constructor() {}

  /**
   * Helper to convert Uint8Array into yume-chan ReadableStream format
   */
  private arrayToStream(array: Uint8Array): ReadableStream<Consumable<Uint8Array>> {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Consumable(array));
        controller.close();
      }
    });
  }

  /**
   * Helper to spawn process safely across available shell protocols
   */
  private async spawnCommand(command: string) {
    if (!this.adb) throw new Error('Adb instance not active');
    if (this.adb.subprocess.shellProtocol) {
      return await this.adb.subprocess.shellProtocol.spawn(command);
    } else {
      return await this.adb.subprocess.noneProtocol.spawn(command);
    }
  }

  /**
   * Request WebUSB device and establish ADB connection
   */
  async connect(onVideoData: (data: Uint8Array) => void): Promise<string> {
    this.onVideoDataCallback = onVideoData;
    
    // 1. Get WebUSB backend device chooser dialog via Manager
    const manager = AdbWebUsbBackendManager.BROWSER;
    if (!manager) {
      throw new Error('이 브라우저는 WebUSB API를 지원하지 않습니다. Chrome/Edge 등을 사용하세요.');
    }

    const backend = await manager.requestDevice();
    if (!backend) {
      throw new Error('디바이스 선택이 취소되었습니다.');
    }

    // 2. Open USB interface connection
    const connection = await backend.connect();

    // 3. Authenticate transport with key pair (Cast connection to any for type compatibility)
    const transport = await AdbDaemonTransport.authenticate({
      serial: backend.serial,
      connection: connection as any,
      credentialStore: new AdbWebCredentialStore(),
      authenticators: ADB_DEFAULT_AUTHENTICATORS,
    });

    // 4. Create Adb instance
    this.adb = new Adb(transport);
    this.isConnected = true;

    // 5. Push scrcpy-server binary to phone /data/local/tmp
    await this.pushScrcpyServer();

    // 6. Setup reverse port forwarding listener for scrcpy video stream
    await this.setupReversePortForwarding();

    // 7. Start scrcpy-server on Android device shell
    await this.launchScrcpyServer();

    return backend.serial || 'WebUSB Device';
  }

  /**
   * Push scrcpy-server binary to the device via ADB Sync
   */
  private async pushScrcpyServer() {
    if (!this.adb) return;

    const baseUrl = import.meta.env.BASE_URL || '/';
    const serverUrl = baseUrl.endsWith('/') ? `${baseUrl}scrcpy-server` : `${baseUrl}/scrcpy-server`;
    const res = await fetch(serverUrl);
    if (!res.ok) {
      throw new Error(`scrcpy-server 바이너리 fetch 실패 (Status: ${res.status}, URL: ${serverUrl})`);
    }

    const fileBuffer = await res.arrayBuffer();
    const sync = await this.adb.sync();
    try {
      await sync.write({
        filename: '/data/local/tmp/scrcpy-server.jar',
        file: this.arrayToStream(new Uint8Array(fileBuffer)),
        permission: 0o755,
      });
    } finally {
      await sync.dispose();
    }
  }

  /**
   * Setup abstract localabstract:scrcpy reverse forwarding to receive video/control streams
   */
  private async setupReversePortForwarding() {
    if (!this.adb) return;

    console.log('[WebUSB] setupReversePortForwarding: requesting reverse localabstract:scrcpy...');
    // Scrcpy server will connect to reverse tunnel on port/name 'scrcpy'
    await this.adb.reverse.add('localabstract:scrcpy', async (socket) => {
      // First connection is usually the Video Stream socket
      if (!this.videoSocket) {
        console.log('[WebUSB] Video Socket Connection established!');
        this.videoSocket = socket;
        this.readVideoStream(socket);
      } else if (!this.controlSocket) {
        // Second connection is usually the Control Socket
        console.log('[WebUSB] Control Socket Connection established!');
        this.controlSocket = socket;
        this.readControlFeedback(socket);
      }
    });
  }

  /**
   * Run the actual scrcpy-server process inside android shell
   */
  private async launchScrcpyServer() {
    // Run scrcpy-server using app_process
    this.serverProcess = await this.spawnCommand(
      'CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server 2.4 tunnel_forward=false video=true audio=false control=true max_size=1080 video_bit_rate=4000000 max_fps=60'
    );
  }

  /**
   * Continuously read binary video chunks from socket and push to callback
   */
  private async readVideoStream(socket: any) {
    const reader = (socket.readable as any).getReader();
    try {
      while (this.isConnected) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value && this.onVideoDataCallback) {
          this.onVideoDataCallback(value);
        }
      }
    } catch (e) {
      console.error('Error reading video stream:', e);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Read feedback metadata from control socket (mostly unused for normal input)
   */
  private async readControlFeedback(socket: any) {
    const reader = (socket.readable as any).getReader();
    try {
      while (this.isConnected) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch (e) {
      console.error('Error reading control feedback:', e);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Inject mouse touch packet directly via WebUSB control socket
   */
  async injectTouch(buffer: Uint8Array) {
    if (!this.controlSocket) {
      console.warn('[WebUSB] injectTouch: No control socket connected yet.');
      return;
    }
    const writer = (this.controlSocket.writable as any).getWriter();
    try {
      await writer.write(new Consumable(buffer));
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Inject key event packet directly via WebUSB control socket
   */
  async injectKey(buffer: Uint8Array) {
    if (!this.controlSocket) {
      console.warn('[WebUSB] injectKey: No control socket connected yet.');
      return;
    }
    const writer = (this.controlSocket.writable as any).getWriter();
    try {
      await writer.write(new Consumable(buffer));
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * System key events require adb shell execution as a hybrid fallback
   */
  async injectSystemKey(keyCode: string) {
    try {
      await this.spawnCommand(`input keyevent ${keyCode}`);
    } catch (e) {
      console.error('Failed to inject system key via WebUSB shell:', e);
    }
  }

  /**
   * Push generic file to phone /sdcard/Download/ path directly via WebUSB Sync
   */
  async pushFile(fileName: string, data: Uint8Array, onProgress?: (progress: number) => void) {
    if (!this.adb) return;
    const sync = await this.adb.sync();
    try {
      await sync.write({
        filename: `/sdcard/Download/${fileName}`,
        file: this.arrayToStream(data),
        permission: 0o644,
      });
      if (onProgress) onProgress(100);
    } finally {
      await sync.dispose();
    }
  }

  /**
   * Install APK package to phone directly via WebUSB PM shell
   */
  async installApk(fileName: string, data: Uint8Array) {
    // 1. Push APK temporarily
    const tempPath = `/data/local/tmp/${fileName}`;
    const sync = await this.adb.sync();
    try {
      await sync.write({
        filename: tempPath,
        file: this.arrayToStream(data),
        permission: 0o755,
      });
    } finally {
      await sync.dispose();
    }

    // 2. Trigger installation via package manager (pm)
    const proc = await this.spawnCommand(`pm install -r "${tempPath}"`);
    const stdoutStream = (proc as any).stdout || (proc as any).output;
    const reader = stdoutStream.getReader();
    try {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }

    // 3. Remove temporary APK
    try {
      await this.spawnCommand(`rm "${tempPath}"`);
    } catch (e) {
      // Ignored
    }
  }

  /**
   * Close all sockets and terminate serverless adb session
   */
  async disconnect() {
    this.isConnected = false;
    
    if (this.videoSocket) {
      try { this.videoSocket.close(); } catch(e){}
      this.videoSocket = null;
    }
    if (this.controlSocket) {
      try { this.controlSocket.close(); } catch(e){}
      this.controlSocket = null;
    }
    if (this.serverProcess) {
      try { await this.serverProcess.kill(); } catch(e){}
      this.serverProcess = null;
    }
    if (this.adb) {
      try { await this.adb.reverse.remove('localabstract:scrcpy'); } catch(e){}
      this.adb = null;
    }
  }
}
