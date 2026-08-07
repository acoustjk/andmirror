declare module 'jmuxer' {
  interface JMuxerOptions {
    node: HTMLVideoElement | string;
    mode?: 'video' | 'audio' | 'both';
    flv?: boolean;
    fps?: number;
    debug?: boolean;
    clearBuffer?: boolean;
  }

  export default class JMuxer {
    constructor(options: JMuxerOptions);
    feed(data: { video?: Uint8Array; audio?: Uint8Array }): void;
    destroy(): void;
  }
}
