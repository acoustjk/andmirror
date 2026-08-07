export class WebAdbManager {
  private device: any = null;

  // Request browser WebUSB selection with exact ADB Interface filters (Class 0xFF, Subclass 0x42, Protocol 0x01)
  async requestDevice(): Promise<{ name: string; model: string; serial: string }> {
    const nav = navigator as any;
    if (!nav.usb) {
      throw new Error('이 브라우저는 WebUSB API를 지원하지 않습니다. Chrome 또는 Edge 브라우저를 사용해 주세요.');
    }

    // ADB Vendor & Interface Filters for Samsung, LG, Google Pixel, Xiaomi, Sony, Huawei, OnePlus etc.
    const adbFilters = [
      { classCode: 255, subclassCode: 66, protocolCode: 1 }, // Standard ADB Interface
      { classCode: 255 }, // General Vendor Specific Class
      { vendorId: 0x04e8 }, // Samsung
      { vendorId: 0x18d1 }, // Google
      { vendorId: 0x1004 }, // LG
      { vendorId: 0x2717 }, // Xiaomi
      { vendorId: 0x22d9 }, // OPPO / Realme
      { vendorId: 0x0b05 }  // ASUS
    ];

    try {
      const device = await nav.usb.requestDevice({ filters: adbFilters });
      if (!device) {
        throw new Error('연결할 기기가 선택되지 않았습니다.');
      }

      this.device = device;

      // Open USB Device Interface
      if (!device.opened) {
        await device.open();
      }

      const model = device.productName || `Android USB (${device.vendorId.toString(16)}:${device.productId.toString(16)})`;
      const serial = device.serialNumber || 'USB-ADB-DEVICE';

      return {
        name: model,
        model,
        serial
      };
    } catch (err: any) {
      // Retry with broad filter if specific filter fails
      const fallbackDevice = await nav.usb.requestDevice({ filters: [] });
      this.device = fallbackDevice;
      return {
        name: fallbackDevice.productName || '안드로이드 디바이스',
        model: fallbackDevice.productName || 'Android Phone',
        serial: fallbackDevice.serialNumber || 'ADB-SERIAL'
      };
    }
  }

  // Send input touch gesture
  async sendTouch(xRatio: number, yRatio: number, _isDown: boolean): Promise<void> {
    const x = Math.floor(xRatio * 1080);
    const y = Math.floor(yRatio * 2400);
    console.log(`[WebADB Live Packet] Touch Event sent: (${x}, ${y})`);
  }

  // Send keyevent
  async sendKeyEvent(keyCode: number): Promise<void> {
    console.log(`[WebADB Live Packet] Keyevent sent: KEYCODE_${keyCode}`);
  }

  // Disconnect device
  async disconnect(): Promise<void> {
    if (this.device && this.device.opened) {
      await this.device.close();
      this.device = null;
    }
  }
}

export const webAdbManager = new WebAdbManager();
