declare module 'react-plotly.js/factory' {
  import type { ComponentType } from 'react';
  import type { PlotParams } from 'react-plotly.js';
  export default function createPlotlyComponent(plotly: unknown): ComponentType<PlotParams>;
}

declare module 'plotly.js/lib/core' {
  const PlotlyCore: {
    register: (modules: unknown[]) => void;
    [key: string]: unknown;
  };
  export default PlotlyCore;
}

declare module 'plotly.js/lib/bar' { const m: unknown; export default m; }
declare module 'plotly.js/lib/pie' { const m: unknown; export default m; }
declare module 'plotly.js/lib/heatmap' { const m: unknown; export default m; }
declare module 'plotly.js/lib/contour' { const m: unknown; export default m; }
declare module 'plotly.js/lib/scattergl' { const m: unknown; export default m; }
declare module 'plotly.js/lib/scatterpolar' { const m: unknown; export default m; }
declare module 'plotly.js/lib/scattergeo' { const m: unknown; export default m; }
declare module 'plotly.js/lib/scatter3d' { const m: unknown; export default m; }
declare module 'plotly.js/lib/surface' { const m: unknown; export default m; }
declare module 'plotly.js/lib/mesh3d' { const m: unknown; export default m; }
declare module 'plotly.js/lib/volume' { const m: unknown; export default m; }
