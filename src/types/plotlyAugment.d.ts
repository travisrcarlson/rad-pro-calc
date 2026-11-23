import 'plotly.js';

declare module 'plotly.js' {
  interface PlotData {
    isomin?: number;
    isomax?: number;
    surface?: { count?: number; show?: boolean; fill?: number };
    color?: string | string[];
    zauto?: boolean;
  }
}
