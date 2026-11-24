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

const Plot = createPlotlyComponent(Plotly);

export default Plot;
