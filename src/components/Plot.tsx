import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js/lib/core';
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

Plotly.register([
  bar,
  pie,
  heatmap,
  contour,
  scattergl,
  scatterpolar,
  scattergeo,
  scatter3d,
  surface,
  mesh3d,
  volume
]);

const Plot = createPlotlyComponent(Plotly);

export default Plot;
