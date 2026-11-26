import createPlotlyComponentImport from 'react-plotly.js/factory';
import PlotlyImport from 'plotly.js/lib/core';
import bar from 'plotly.js/lib/bar';
import pie from 'plotly.js/lib/pie';
import heatmap from 'plotly.js/lib/heatmap';
import contour from 'plotly.js/lib/contour';
import scattergl from 'plotly.js/lib/scattergl';
import scatterpolar from 'plotly.js/lib/scatterpolar';
import scattergeo from 'plotly.js/lib/scattergeo';
import scatter3d from 'plotly.js/lib/scatter3d';
import surface from 'plotly.js/lib/surface';
import mesh3d from 'plotly.js/lib/mesh3d';
import volume from 'plotly.js/lib/volume';

type PlotlyFactoryFn = typeof createPlotlyComponentImport;
type CjsWrapped<T> = T | { default: T };

function unwrapTrace<T>(mod: T): T {
  if (mod && typeof mod === 'object' && 'default' in mod && !('moduleType' in mod)) {
    return (mod as unknown as { default: T }).default;
  }
  return mod;
}

// Vite/Rolldown CJS interop evaluates `exports.__esModule` modules as `{ default: fn }`
const rawFactory = createPlotlyComponentImport as unknown as CjsWrapped<PlotlyFactoryFn>;
const createPlotlyComponent: PlotlyFactoryFn =
  typeof rawFactory === 'function' ? rawFactory : rawFactory.default;

const rawPlotly = PlotlyImport as unknown as CjsWrapped<typeof PlotlyImport>;
const Plotly: typeof PlotlyImport =
  'register' in rawPlotly && typeof rawPlotly.register === 'function'
    ? (rawPlotly as typeof PlotlyImport)
    : (rawPlotly as { default: typeof PlotlyImport }).default;

Plotly.register([
  unwrapTrace(bar),
  unwrapTrace(pie),
  unwrapTrace(heatmap),
  unwrapTrace(contour),
  unwrapTrace(scattergl),
  unwrapTrace(scatterpolar),
  unwrapTrace(scattergeo),
  unwrapTrace(scatter3d),
  unwrapTrace(surface),
  unwrapTrace(mesh3d),
  unwrapTrace(volume)
]);

type PlotlyEl = HTMLElement & {
  _context?: { _scrollZoom?: Record<string, number>; __radproGuard?: boolean };
};

type PlotlyRuntime = typeof PlotlyImport & {
  purge: (root: string | HTMLElement) => void;
  react: (...args: unknown[]) => Promise<unknown>;
  Plots?: {
    resize?: (root: string | HTMLElement) => Promise<unknown> | unknown;
  };
  __radproPatched?: boolean;
};

const plotlyRuntime = Plotly as unknown as PlotlyRuntime;

// Guard Plotly unmount/resize lifecycle races on the genuine singleton without cloning it:
// - Attach a sentinel _context._scrollZoom stub synchronously after purge so in-flight async
//   scattergeo promises don't crash on `_scrollZoom`, then strip the sentinel on the next
//   Plotly.react call so StrictMode double-mounts re-initialize a full genuine _context.
// - Skip Plots.resize on detached or zero-sized containers during rapid route transitions.
if (!plotlyRuntime.__radproPatched) {
  plotlyRuntime.__radproPatched = true;
  const originalPurge = plotlyRuntime.purge.bind(plotlyRuntime);
  const originalReact = plotlyRuntime.react.bind(plotlyRuntime);

  plotlyRuntime.purge = (root: string | HTMLElement) => {
    originalPurge(root);
    if (typeof document === 'undefined') return;
    const el = (typeof root === 'string' ? document.getElementById(root) : root) as PlotlyEl | null;
    if (el && typeof el === 'object' && !el._context) {
      el._context = { _scrollZoom: {}, __radproGuard: true };
    }
  };

  plotlyRuntime.react = (root: unknown, ...rest: unknown[]) => {
    if (typeof document !== 'undefined') {
      const el = (typeof root === 'string' ? document.getElementById(root) : root) as PlotlyEl | null;
      if (el && el._context?.__radproGuard) {
        delete el._context;
      }
    }
    return originalReact(root, ...rest);
  };

  if (plotlyRuntime.Plots && typeof plotlyRuntime.Plots.resize === 'function') {
    const originalResize = plotlyRuntime.Plots.resize.bind(plotlyRuntime.Plots);
    plotlyRuntime.Plots.resize = (root: string | HTMLElement) => {
      if (typeof document === 'undefined') return Promise.resolve(root);
      const el = typeof root === 'string' ? document.getElementById(root) : root;
      if (!el || !el.isConnected || el.clientWidth <= 0 || el.clientHeight <= 0) {
        return Promise.resolve(el);
      }
      return originalResize(el);
    };
  }
}

const Plot = createPlotlyComponent(Plotly);

export default Plot;
