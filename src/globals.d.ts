declare module 'react-katex' {
  export interface MathComponentProps {
    math?: string;
    children?: string;
    errorColor?: string;
    renderError?: (error: Error) => import('react').ReactNode;
  }
  export const InlineMath: import('react').ComponentType<MathComponentProps>;
  export const BlockMath: import('react').ComponentType<MathComponentProps>;
}

interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  close(): Promise<void>;
}

interface Navigator {
  serial?: {
    requestPort(): Promise<SerialPortLike>;
  };
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
}
