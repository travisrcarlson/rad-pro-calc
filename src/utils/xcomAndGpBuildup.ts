/**
 * NIST XCOM Mass Attenuation Database (with Explicit K/L Photoelectric Absorption Edges)
 * & ANSI/ANS-6.4.3 Geometric Progression (GP) 5-Parameter Buildup Factor Engine
 *
 * References:
 * - NIST Standard Reference Database 8 (XCOM): Berger, Hubbell, Seltzer et al.
 * - ANSI/ANS-6.4.3-1991: Gamma-Ray Attenuation Coefficients and Buildup Factors for Engineering Materials
 * - Harima, Y. (1983), "An Approximation of Gamma-Ray Buildup Factors by Geometrical Progression", Nucl. Sci. Eng. 83, 299-309.
 * - Broder, D.L. et al. (1962) / Kalos, M.H. (1956): Multi-layer stratified shield buildup synthesis.
 */

export interface AbsorptionEdge {
  shell: 'K' | 'L1' | 'L2' | 'L3';
  energyMev: number;
  muMassBelow: number; // cm²/g immediately below edge
  muMassAbove: number; // cm²/g immediately above edge
  jumpRatio: number;
}

export interface GPParameterRow {
  energyMev: number;
  b: number;  // Buildup factor at 1.0 mfp
  c: number;  // Multiplicative spectrum progression factor
  a: number;  // Power-law exponent
  Xk: number; // Characteristic relaxation depth (mfp)
  d: number;  // Hyperbolic tangent asymptotic coefficient
}

export interface XCOMMaterialSpec {
  key: string;
  name: string;
  symbol: string;
  effectiveZ: number;
  density: number; // g/cm³
  edges: AbsorptionEdge[];
  /**
   * Piecewise smooth segments [energyMev, muMass (cm²/g), muEnMass (cm²/g)][]
   * Split at each absorption edge so log-log interpolation never smears across a shell discontinuity.
   */
  segments: {
    minEnergyMev: number;
    maxEnergyMev: number;
    points: [number, number, number][]; // [E_MeV, mu/rho, mu_en/rho]
  }[];
  gpTable: GPParameterRow[];
  bergerA: number;
  bergerB: number;
}

export type BuildupModelType = 'GP_ANS643' | 'BERGER' | 'TAYLOR' | 'NARROW_BEAM';

export const XCOM_GP_MATERIALS: Record<string, XCOMMaterialSpec> = {
  LEAD: {
    key: 'LEAD',
    name: 'Lead (Pb, Z=82)',
    symbol: 'Pb',
    effectiveZ: 82,
    density: 11.34,
    edges: [
      { shell: 'L3', energyMev: 0.013035, muMassBelow: 67.1, muMassAbove: 162.1, jumpRatio: 2.42 },
      { shell: 'L2', energyMev: 0.015200, muMassBelow: 108.5, muMassAbove: 148.2, jumpRatio: 1.37 },
      { shell: 'L1', energyMev: 0.015861, muMassBelow: 132.4, muMassAbove: 154.8, jumpRatio: 1.17 },
      { shell: 'K',  energyMev: 0.088005, muMassBelow: 1.910, muMassAbove: 7.683, jumpRatio: 4.02 }
    ],
    segments: [
      {
        minEnergyMev: 0.010,
        maxEnergyMev: 0.013035,
        points: [
          [0.010, 130.6, 124.7],
          [0.013035, 67.1, 63.5]
        ]
      },
      {
        minEnergyMev: 0.013035,
        maxEnergyMev: 0.015200,
        points: [
          [0.013035, 162.1, 133.8],
          [0.015200, 108.5, 89.2]
        ]
      },
      {
        minEnergyMev: 0.015200,
        maxEnergyMev: 0.015861,
        points: [
          [0.015200, 148.2, 122.0],
          [0.015861, 132.4, 109.1]
        ]
      },
      {
        minEnergyMev: 0.015861,
        maxEnergyMev: 0.088005,
        points: [
          [0.015861, 154.8, 127.9],
          [0.020, 86.36, 72.4],
          [0.030, 30.32, 25.9],
          [0.040, 14.36, 12.2],
          [0.050, 8.041, 6.74],
          [0.060, 5.021, 4.13],
          [0.080, 2.419, 1.92],
          [0.088005, 1.910, 1.49]
        ]
      },
      {
        minEnergyMev: 0.088005,
        maxEnergyMev: 15.0,
        points: [
          [0.088005, 7.683, 2.16],
          [0.100, 5.549, 1.98],
          [0.150, 2.014, 1.06],
          [0.200, 0.9985, 0.587],
          [0.300, 0.4026, 0.246],
          [0.400, 0.2323, 0.137],
          [0.500, 0.1614, 0.0919],
          [0.6617, 0.1101, 0.0587],
          [0.800, 0.0887, 0.0464],
          [1.000, 0.07102, 0.0379],
          [1.250, 0.05876, 0.0315],
          [1.500, 0.05222, 0.0282],
          [2.000, 0.04606, 0.0259],
          [3.000, 0.04234, 0.0260],
          [4.000, 0.04197, 0.0272],
          [6.000, 0.04391, 0.0302],
          [8.000, 0.04675, 0.0330],
          [10.00, 0.04972, 0.0355],
          [15.00, 0.05658, 0.0402]
        ]
      }
    ],
    gpTable: [
      { energyMev: 0.030, b: 1.018, c: 0.364, a: 0.230, Xk: 14.2, d: -0.145 },
      { energyMev: 0.050, b: 1.045, c: 0.412, a: 0.205, Xk: 14.0, d: -0.118 },
      { energyMev: 0.088, b: 1.620, c: 1.290, a: -0.025, Xk: 12.8, d: 0.015 }, // Just below K-edge fluorescence peak
      { energyMev: 0.100, b: 1.240, c: 0.515, a: 0.155, Xk: 13.5, d: -0.072 },
      { energyMev: 0.200, b: 1.200, c: 0.485, a: 0.172, Xk: 13.8, d: -0.085 },
      { energyMev: 0.500, b: 1.240, c: 0.626, a: 0.114, Xk: 14.2, d: -0.051 },
      { energyMev: 0.662, b: 1.300, c: 0.720, a: 0.082, Xk: 14.1, d: -0.036 },
      { energyMev: 1.000, b: 1.370, c: 0.875, a: 0.043, Xk: 13.9, d: -0.022 },
      { energyMev: 1.250, b: 1.390, c: 0.945, a: 0.028, Xk: 13.8, d: -0.018 },
      { energyMev: 2.000, b: 1.420, c: 1.060, a: 0.008, Xk: 13.6, d: -0.014 },
      { energyMev: 4.000, b: 1.360, c: 1.180, a: -0.010, Xk: 13.4, d: -0.012 },
      { energyMev: 6.000, b: 1.290, c: 1.260, a: -0.018, Xk: 13.2, d: -0.010 },
      { energyMev: 10.00, b: 1.210, c: 1.380, a: -0.025, Xk: 13.0, d: -0.008 }
    ],
    bergerA: 0.37,
    bergerB: 0.018
  },

  TUNGSTEN: {
    key: 'TUNGSTEN',
    name: 'Tungsten (W, Z=74)',
    symbol: 'W',
    effectiveZ: 74,
    density: 19.30,
    edges: [
      { shell: 'L3', energyMev: 0.010207, muMassBelow: 95.8, muMassAbove: 238.5, jumpRatio: 2.49 },
      { shell: 'L1', energyMev: 0.012100, muMassBelow: 185.0, muMassAbove: 232.0, jumpRatio: 1.25 },
      { shell: 'K',  energyMev: 0.069525, muMassBelow: 2.241, muMassAbove: 11.23, jumpRatio: 5.01 }
    ],
    segments: [
      {
        minEnergyMev: 0.010,
        maxEnergyMev: 0.012100,
        points: [
          [0.010, 99.0, 91.0],
          [0.012100, 185.0, 152.0]
        ]
      },
      {
        minEnergyMev: 0.012100,
        maxEnergyMev: 0.069525,
        points: [
          [0.012100, 232.0, 190.5],
          [0.015, 138.9, 114.2],
          [0.020, 65.73, 55.1],
          [0.030, 22.73, 19.3],
          [0.040, 10.67, 9.01],
          [0.050, 5.950, 4.97],
          [0.060, 3.713, 3.04],
          [0.069525, 2.241, 1.79]
        ]
      },
      {
        minEnergyMev: 0.069525,
        maxEnergyMev: 15.0,
        points: [
          [0.069525, 11.23, 3.31],
          [0.080, 7.810, 2.91],
          [0.100, 4.438, 2.05],
          [0.150, 1.581, 0.916],
          [0.200, 0.7844, 0.476],
          [0.300, 0.3238, 0.194],
          [0.500, 0.1378, 0.0764],
          [0.6617, 0.0978, 0.0512],
          [1.000, 0.06618, 0.0346],
          [1.250, 0.05526, 0.0294],
          [2.000, 0.04433, 0.0249],
          [4.000, 0.04038, 0.0261],
          [6.000, 0.04183, 0.0287],
          [10.00, 0.04691, 0.0335],
          [15.00, 0.05310, 0.0380]
        ]
      }
    ],
    gpTable: [
      { energyMev: 0.030, b: 1.022, c: 0.380, a: 0.220, Xk: 14.1, d: -0.130 },
      { energyMev: 0.050, b: 1.058, c: 0.430, a: 0.195, Xk: 13.9, d: -0.105 },
      { energyMev: 0.069, b: 1.550, c: 1.210, a: -0.015, Xk: 12.9, d: 0.010 },
      { energyMev: 0.100, b: 1.210, c: 0.510, a: 0.158, Xk: 13.6, d: -0.075 },
      { energyMev: 0.200, b: 1.250, c: 0.540, a: 0.148, Xk: 13.8, d: -0.070 },
      { energyMev: 0.500, b: 1.310, c: 0.695, a: 0.092, Xk: 14.0, d: -0.042 },
      { energyMev: 0.662, b: 1.370, c: 0.785, a: 0.065, Xk: 14.0, d: -0.030 },
      { energyMev: 1.000, b: 1.440, c: 0.930, a: 0.032, Xk: 13.8, d: -0.018 },
      { energyMev: 1.250, b: 1.460, c: 0.990, a: 0.018, Xk: 13.7, d: -0.014 },
      { energyMev: 2.000, b: 1.490, c: 1.090, a: 0.002, Xk: 13.5, d: -0.011 },
      { energyMev: 6.000, b: 1.330, c: 1.250, a: -0.015, Xk: 13.1, d: -0.009 },
      { energyMev: 10.00, b: 1.240, c: 1.360, a: -0.022, Xk: 12.9, d: -0.007 }
    ],
    bergerA: 0.44,
    bergerB: 0.020
  },

  DU: {
    key: 'DU',
    name: 'Depleted Uranium (U-238, Z=92)',
    symbol: 'U-238',
    effectiveZ: 92,
    density: 19.10,
    edges: [
      { shell: 'L3', energyMev: 0.017166, muMassBelow: 44.5, muMassAbove: 104.2, jumpRatio: 2.34 },
      { shell: 'L1', energyMev: 0.021757, muMassBelow: 68.1, muMassAbove: 86.4, jumpRatio: 1.27 },
      { shell: 'K',  energyMev: 0.115606, muMassBelow: 1.231, muMassAbove: 4.862, jumpRatio: 3.95 }
    ],
    segments: [
      {
        minEnergyMev: 0.010,
        maxEnergyMev: 0.017166,
        points: [
          [0.010, 178.0, 168.0],
          [0.015, 63.8, 59.8],
          [0.017166, 44.5, 41.6]
        ]
      },
      {
        minEnergyMev: 0.017166,
        maxEnergyMev: 0.021757,
        points: [
          [0.017166, 104.2, 85.1],
          [0.021757, 68.1, 55.6]
        ]
      },
      {
        minEnergyMev: 0.021757,
        maxEnergyMev: 0.115606,
        points: [
          [0.021757, 86.4, 70.8],
          [0.030, 41.2, 34.8],
          [0.050, 11.2, 9.40],
          [0.080, 3.39, 2.75],
          [0.100, 1.95, 1.54],
          [0.115606, 1.231, 0.945]
        ]
      },
      {
        minEnergyMev: 0.115606,
        maxEnergyMev: 15.0,
        points: [
          [0.115606, 4.862, 1.38],
          [0.150, 2.580, 1.18],
          [0.200, 1.280, 0.710],
          [0.300, 0.501, 0.306],
          [0.500, 0.193, 0.112],
          [0.6617, 0.126, 0.0685],
          [1.000, 0.0789, 0.0425],
          [1.250, 0.0642, 0.0348],
          [2.000, 0.0493, 0.0278],
          [4.000, 0.0445, 0.0289],
          [6.000, 0.0468, 0.0322],
          [10.00, 0.0534, 0.0381],
          [15.00, 0.0612, 0.0436]
        ]
      }
    ],
    gpTable: [
      { energyMev: 0.050, b: 1.032, c: 0.390, a: 0.215, Xk: 14.0, d: -0.125 },
      { energyMev: 0.100, b: 1.480, c: 1.180, a: -0.010, Xk: 13.0, d: 0.008 },
      { energyMev: 0.200, b: 1.160, c: 0.450, a: 0.180, Xk: 13.9, d: -0.090 },
      { energyMev: 0.500, b: 1.190, c: 0.580, a: 0.125, Xk: 14.2, d: -0.058 },
      { energyMev: 0.662, b: 1.240, c: 0.665, a: 0.095, Xk: 14.1, d: -0.042 },
      { energyMev: 1.000, b: 1.310, c: 0.810, a: 0.055, Xk: 13.9, d: -0.026 },
      { energyMev: 1.250, b: 1.330, c: 0.885, a: 0.038, Xk: 13.8, d: -0.020 },
      { energyMev: 2.000, b: 1.360, c: 1.010, a: 0.015, Xk: 13.6, d: -0.015 },
      { energyMev: 6.000, b: 1.250, c: 1.240, a: -0.016, Xk: 13.2, d: -0.010 },
      { energyMev: 10.00, b: 1.180, c: 1.360, a: -0.024, Xk: 13.0, d: -0.008 }
    ],
    bergerA: 0.31,
    bergerB: 0.015
  },

  STEEL: {
    key: 'STEEL',
    name: 'Carbon Steel / Iron (Fe, Z=26)',
    symbol: 'Fe',
    effectiveZ: 26,
    density: 7.87,
    edges: [
      { shell: 'K', energyMev: 0.007112, muMassBelow: 51.4, muMassAbove: 405.8, jumpRatio: 7.89 }
    ],
    segments: [
      {
        minEnergyMev: 0.010,
        maxEnergyMev: 15.0,
        points: [
          [0.010, 170.6, 166.8],
          [0.015, 57.08, 55.5],
          [0.020, 25.68, 24.7],
          [0.030, 8.176, 7.60],
          [0.040, 3.629, 3.22],
          [0.050, 1.958, 1.64],
          [0.060, 1.205, 0.956],
          [0.080, 0.5952, 0.410],
          [0.100, 0.3717, 0.219],
          [0.150, 0.1964, 0.0801],
          [0.200, 0.1460, 0.0485],
          [0.300, 0.1099, 0.0339],
          [0.400, 0.0940, 0.0306],
          [0.500, 0.08414, 0.0294],
          [0.6617, 0.07386, 0.0282],
          [0.800, 0.06699, 0.0273],
          [1.000, 0.05995, 0.0261],
          [1.250, 0.05350, 0.0248],
          [1.500, 0.04883, 0.0236],
          [2.000, 0.04265, 0.0219],
          [3.000, 0.03622, 0.0204],
          [4.000, 0.03312, 0.0199],
          [6.000, 0.03057, 0.0200],
          [10.00, 0.02994, 0.0211],
          [15.00, 0.03092, 0.0226]
        ]
      }
    ],
    gpTable: [
      { energyMev: 0.030, b: 1.070, c: 0.372, a: 0.219, Xk: 14.1, d: -0.118 },
      { energyMev: 0.050, b: 1.220, c: 0.510, a: 0.155, Xk: 14.2, d: -0.078 },
      { energyMev: 0.100, b: 1.660, c: 0.875, a: 0.048, Xk: 14.0, d: -0.028 },
      { energyMev: 0.200, b: 2.020, c: 1.190, a: -0.012, Xk: 13.8, d: -0.002 },
      { energyMev: 0.500, b: 1.980, c: 1.260, a: -0.024, Xk: 13.6, d: 0.004 },
      { energyMev: 0.662, b: 1.920, c: 1.235, a: -0.020, Xk: 13.6, d: 0.002 },
      { energyMev: 1.000, b: 1.850, c: 1.190, a: -0.014, Xk: 13.5, d: 0.000 },
      { energyMev: 1.250, b: 1.800, c: 1.160, a: -0.010, Xk: 13.5, d: -0.002 },
      { energyMev: 2.000, b: 1.710, c: 1.110, a: -0.004, Xk: 13.4, d: -0.004 },
      { energyMev: 4.000, b: 1.550, c: 1.060, a: 0.002, Xk: 13.3, d: -0.006 },
      { energyMev: 6.000, b: 1.450, c: 1.050, a: 0.003, Xk: 13.2, d: -0.007 },
      { energyMev: 10.00, b: 1.330, c: 1.060, a: 0.001, Xk: 13.1, d: -0.008 }
    ],
    bergerA: 0.85,
    bergerB: 0.036
  },

  CONCRETE: {
    key: 'CONCRETE',
    name: 'Standard Ordinary Concrete (Z_eff ≈ 11)',
    symbol: 'Conc',
    effectiveZ: 11,
    density: 2.35,
    edges: [],
    segments: [
      {
        minEnergyMev: 0.010,
        maxEnergyMev: 15.0,
        points: [
          [0.010, 26.90, 25.8],
          [0.015, 8.240, 7.66],
          [0.020, 3.590, 3.16],
          [0.030, 1.190, 0.906],
          [0.040, 0.605, 0.378],
          [0.050, 0.392, 0.198],
          [0.060, 0.295, 0.120],
          [0.080, 0.213, 0.0615],
          [0.100, 0.179, 0.0419],
          [0.150, 0.144, 0.0301],
          [0.200, 0.127, 0.0289],
          [0.300, 0.108, 0.0294],
          [0.500, 0.0877, 0.0299],
          [0.6617, 0.0778, 0.0296],
          [1.000, 0.0637, 0.0280],
          [1.250, 0.0569, 0.0267],
          [2.000, 0.0448, 0.0235],
          [4.000, 0.0319, 0.0195],
          [6.000, 0.0270, 0.0180],
          [10.00, 0.0231, 0.0169],
          [15.00, 0.0215, 0.0165]
        ]
      }
    ],
    gpTable: [
      { energyMev: 0.030, b: 1.430, c: 0.690, a: 0.095, Xk: 14.2, d: -0.048 },
      { energyMev: 0.050, b: 2.210, c: 1.240, a: -0.022, Xk: 13.8, d: 0.005 },
      { energyMev: 0.100, b: 2.950, c: 1.680, a: -0.072, Xk: 13.6, d: 0.032 },
      { energyMev: 0.200, b: 2.720, c: 1.580, a: -0.062, Xk: 13.7, d: 0.026 },
      { energyMev: 0.500, b: 2.270, c: 1.370, a: -0.038, Xk: 13.8, d: 0.014 },
      { energyMev: 0.662, b: 2.130, c: 1.300, a: -0.030, Xk: 13.8, d: 0.010 },
      { energyMev: 1.000, b: 1.980, c: 1.210, a: -0.018, Xk: 13.7, d: 0.005 },
      { energyMev: 1.250, b: 1.910, c: 1.170, a: -0.012, Xk: 13.7, d: 0.002 },
      { energyMev: 2.000, b: 1.770, c: 1.100, a: -0.002, Xk: 13.6, d: -0.002 },
      { energyMev: 4.000, b: 1.590, c: 1.030, a: 0.008, Xk: 13.5, d: -0.006 },
      { energyMev: 6.000, b: 1.490, c: 1.000, a: 0.012, Xk: 13.4, d: -0.008 },
      { energyMev: 10.00, b: 1.370, c: 0.970, a: 0.015, Xk: 13.3, d: -0.010 }
    ],
    bergerA: 1.15,
    bergerB: 0.048
  },

  BARITE_CONCRETE: {
    key: 'BARITE_CONCRETE',
    name: 'Heavy Barite Concrete (BaSO4, Ba K-edge 37.4 keV)',
    symbol: 'Barite',
    effectiveZ: 42,
    density: 3.50,
    edges: [
      { shell: 'K', energyMev: 0.037441, muMassBelow: 2.150, muMassAbove: 8.902, jumpRatio: 4.14 }
    ],
    segments: [
      {
        minEnergyMev: 0.010,
        maxEnergyMev: 0.037441,
        points: [
          [0.010, 68.0, 63.2],
          [0.015, 22.4, 20.5],
          [0.020, 10.2, 9.15],
          [0.030, 3.65, 3.12],
          [0.037441, 2.150, 1.78]
        ]
      },
      {
        minEnergyMev: 0.037441,
        maxEnergyMev: 15.0,
        points: [
          [0.037441, 8.902, 5.12],
          [0.050, 4.320, 2.85],
          [0.060, 2.680, 1.82],
          [0.080, 1.280, 0.850],
          [0.100, 0.750, 0.465],
          [0.150, 0.312, 0.165],
          [0.200, 0.195, 0.088],
          [0.300, 0.125, 0.045],
          [0.500, 0.0910, 0.032],
          [0.6617, 0.0792, 0.0298],
          [1.000, 0.0642, 0.0275],
          [1.250, 0.0572, 0.0260],
          [2.000, 0.0455, 0.0232],
          [4.000, 0.0348, 0.0205],
          [6.000, 0.0315, 0.0198],
          [10.00, 0.0298, 0.0202],
          [15.00, 0.0302, 0.0210]
        ]
      }
    ],
    gpTable: [
      { energyMev: 0.050, b: 1.150, c: 0.480, a: 0.168, Xk: 14.0, d: -0.088 },
      { energyMev: 0.100, b: 1.420, c: 0.710, a: 0.090, Xk: 14.0, d: -0.045 },
      { energyMev: 0.200, b: 1.750, c: 0.990, a: 0.018, Xk: 13.8, d: -0.012 },
      { energyMev: 0.500, b: 1.880, c: 1.150, a: -0.010, Xk: 13.7, d: 0.000 },
      { energyMev: 0.662, b: 1.850, c: 1.150, a: -0.010, Xk: 13.7, d: 0.000 },
      { energyMev: 1.000, b: 1.790, c: 1.130, a: -0.006, Xk: 13.6, d: -0.002 },
      { energyMev: 1.250, b: 1.750, c: 1.110, a: -0.004, Xk: 13.6, d: -0.003 },
      { energyMev: 2.000, b: 1.660, c: 1.080, a: 0.001, Xk: 13.5, d: -0.005 },
      { energyMev: 6.000, b: 1.420, c: 1.060, a: 0.002, Xk: 13.3, d: -0.007 },
      { energyMev: 10.00, b: 1.310, c: 1.080, a: -0.002, Xk: 13.1, d: -0.008 }
    ],
    bergerA: 0.78,
    bergerB: 0.032
  },

  ALUMINUM: {
    key: 'ALUMINUM',
    name: 'Aluminum (Al, Z=13)',
    symbol: 'Al',
    effectiveZ: 13,
    density: 2.70,
    edges: [],
    segments: [
      {
        minEnergyMev: 0.010,
        maxEnergyMev: 15.0,
        points: [
          [0.010, 26.23, 25.4],
          [0.015, 7.955, 7.48],
          [0.020, 3.441, 3.09],
          [0.030, 1.128, 0.878],
          [0.050, 0.3681, 0.184],
          [0.080, 0.2018, 0.0551],
          [0.100, 0.1704, 0.0379],
          [0.200, 0.1223, 0.0275],
          [0.500, 0.08445, 0.0287],
          [0.6617, 0.07468, 0.0285],
          [1.000, 0.06146, 0.0269],
          [1.250, 0.05496, 0.0257],
          [2.000, 0.04324, 0.0227],
          [4.000, 0.03106, 0.0188],
          [6.000, 0.02655, 0.0174],
          [10.00, 0.02318, 0.0165],
          [15.00, 0.02195, 0.0163]
        ]
      }
    ],
    gpTable: [
      { energyMev: 0.050, b: 2.340, c: 1.290, a: -0.028, Xk: 13.7, d: 0.008 },
      { energyMev: 0.100, b: 2.890, c: 1.640, a: -0.068, Xk: 13.6, d: 0.029 },
      { energyMev: 0.200, b: 2.660, c: 1.540, a: -0.058, Xk: 13.7, d: 0.024 },
      { energyMev: 0.500, b: 2.240, c: 1.350, a: -0.035, Xk: 13.8, d: 0.012 },
      { energyMev: 0.662, b: 2.100, c: 1.280, a: -0.028, Xk: 13.8, d: 0.008 },
      { energyMev: 1.000, b: 1.960, c: 1.200, a: -0.016, Xk: 13.7, d: 0.004 },
      { energyMev: 1.250, b: 1.890, c: 1.160, a: -0.011, Xk: 13.7, d: 0.002 },
      { energyMev: 2.000, b: 1.750, c: 1.095, a: -0.001, Xk: 13.6, d: -0.002 },
      { energyMev: 6.000, b: 1.480, c: 1.005, a: 0.011, Xk: 13.4, d: -0.008 },
      { energyMev: 10.00, b: 1.360, c: 0.980, a: 0.014, Xk: 13.3, d: -0.009 }
    ],
    bergerA: 1.12,
    bergerB: 0.046
  },

  WATER: {
    key: 'WATER',
    name: 'Water (H2O, Z_eff ≈ 7.4)',
    symbol: 'H2O',
    effectiveZ: 7.4,
    density: 1.00,
    edges: [],
    segments: [
      {
        minEnergyMev: 0.010,
        maxEnergyMev: 15.0,
        points: [
          [0.010, 5.329, 4.94],
          [0.015, 1.673, 1.37],
          [0.020, 0.8096, 0.550],
          [0.030, 0.3756, 0.156],
          [0.050, 0.2269, 0.0422],
          [0.080, 0.1837, 0.0262],
          [0.100, 0.1707, 0.0255],
          [0.200, 0.1370, 0.0297],
          [0.500, 0.09687, 0.0330],
          [0.6617, 0.0857, 0.0327],
          [1.000, 0.07072, 0.0310],
          [1.250, 0.06323, 0.0296],
          [2.000, 0.04942, 0.0260],
          [4.000, 0.03403, 0.0206],
          [6.000, 0.02770, 0.0180],
          [10.00, 0.02219, 0.0157],
          [15.00, 0.01941, 0.0144]
        ]
      }
    ],
    gpTable: [
      { energyMev: 0.030, b: 2.410, c: 1.480, a: -0.048, Xk: 13.6, d: 0.018 },
      { energyMev: 0.050, b: 3.450, c: 1.920, a: -0.092, Xk: 13.5, d: 0.042 },
      { energyMev: 0.100, b: 3.780, c: 2.010, a: -0.102, Xk: 13.5, d: 0.048 },
      { energyMev: 0.200, b: 3.260, c: 1.790, a: -0.082, Xk: 13.6, d: 0.036 },
      { energyMev: 0.500, b: 2.520, c: 1.460, a: -0.048, Xk: 13.7, d: 0.018 },
      { energyMev: 0.662, b: 2.310, c: 1.360, a: -0.036, Xk: 13.7, d: 0.012 },
      { energyMev: 1.000, b: 2.130, c: 1.250, a: -0.022, Xk: 13.7, d: 0.006 },
      { energyMev: 1.250, b: 2.030, c: 1.200, a: -0.015, Xk: 13.7, d: 0.003 },
      { energyMev: 2.000, b: 1.840, c: 1.110, a: -0.002, Xk: 13.6, d: -0.002 },
      { energyMev: 4.000, b: 1.630, c: 1.020, a: 0.010, Xk: 13.5, d: -0.007 },
      { energyMev: 6.000, b: 1.520, c: 0.985, a: 0.015, Xk: 13.4, d: -0.009 },
      { energyMev: 10.00, b: 1.390, c: 0.950, a: 0.018, Xk: 13.3, d: -0.011 }
    ],
    bergerA: 1.35,
    bergerB: 0.056
  },

  HDPE: {
    key: 'HDPE',
    name: 'High-Density Polyethylene (CH2, Z_eff ≈ 5.5)',
    symbol: 'HDPE',
    effectiveZ: 5.5,
    density: 0.95,
    edges: [],
    segments: [
      {
        minEnergyMev: 0.010,
        maxEnergyMev: 15.0,
        points: [
          [0.010, 2.088, 1.76],
          [0.015, 0.747, 0.495],
          [0.020, 0.432, 0.205],
          [0.030, 0.271, 0.068],
          [0.050, 0.208, 0.0268],
          [0.080, 0.182, 0.0241],
          [0.100, 0.172, 0.0254],
          [0.200, 0.140, 0.0305],
          [0.500, 0.0995, 0.0339],
          [0.6617, 0.0880, 0.0336],
          [1.000, 0.0726, 0.0319],
          [1.250, 0.0649, 0.0304],
          [2.000, 0.0506, 0.0266],
          [4.000, 0.0345, 0.0209],
          [6.000, 0.0277, 0.0180],
          [10.00, 0.0217, 0.0154],
          [15.00, 0.0186, 0.0138]
        ]
      }
    ],
    gpTable: [
      { energyMev: 0.050, b: 3.850, c: 2.080, a: -0.108, Xk: 13.5, d: 0.052 },
      { energyMev: 0.100, b: 4.100, c: 2.140, a: -0.114, Xk: 13.5, d: 0.055 },
      { energyMev: 0.200, b: 3.420, c: 1.860, a: -0.088, Xk: 13.6, d: 0.040 },
      { energyMev: 0.500, b: 2.600, c: 1.500, a: -0.052, Xk: 13.7, d: 0.020 },
      { energyMev: 0.662, b: 2.380, c: 1.390, a: -0.040, Xk: 13.7, d: 0.014 },
      { energyMev: 1.000, b: 2.180, c: 1.270, a: -0.025, Xk: 13.7, d: 0.007 },
      { energyMev: 1.250, b: 2.070, c: 1.220, a: -0.018, Xk: 13.7, d: 0.004 },
      { energyMev: 2.000, b: 1.870, c: 1.120, a: -0.004, Xk: 13.6, d: -0.001 },
      { energyMev: 6.000, b: 1.540, c: 0.990, a: 0.014, Xk: 13.4, d: -0.008 },
      { energyMev: 10.00, b: 1.410, c: 0.955, a: 0.017, Xk: 13.3, d: -0.010 }
    ],
    bergerA: 1.42,
    bergerB: 0.060
  },

  LEAD_GLASS: {
    key: 'LEAD_GLASS',
    name: 'Lead Glass (High-PbO, 5.2 g/cm³, Pb K-edge 88 keV)',
    symbol: 'Pb-Glass',
    effectiveZ: 64,
    density: 5.20,
    edges: [
      { shell: 'L3', energyMev: 0.013035, muMassBelow: 44.0, muMassAbove: 98.5, jumpRatio: 2.24 },
      { shell: 'K',  energyMev: 0.088005, muMassBelow: 1.180, muMassAbove: 4.520, jumpRatio: 3.83 }
    ],
    segments: [
      {
        minEnergyMev: 0.010,
        maxEnergyMev: 0.013035,
        points: [
          [0.010, 82.0, 77.5],
          [0.013035, 44.0, 41.2]
        ]
      },
      {
        minEnergyMev: 0.013035,
        maxEnergyMev: 0.088005,
        points: [
          [0.013035, 98.5, 81.2],
          [0.020, 51.4, 43.0],
          [0.030, 18.2, 15.4],
          [0.050, 4.82, 4.02],
          [0.080, 1.49, 1.15],
          [0.088005, 1.180, 0.90]
        ]
      },
      {
        minEnergyMev: 0.088005,
        maxEnergyMev: 15.0,
        points: [
          [0.088005, 4.520, 1.32],
          [0.100, 3.280, 1.18],
          [0.150, 1.240, 0.640],
          [0.200, 0.642, 0.362],
          [0.300, 0.282, 0.160],
          [0.500, 0.130, 0.066],
          [0.6617, 0.0955, 0.046],
          [1.000, 0.0672, 0.0332],
          [1.250, 0.0575, 0.0289],
          [2.000, 0.0454, 0.0246],
          [4.000, 0.0382, 0.0238],
          [6.000, 0.0378, 0.0252],
          [10.00, 0.0398, 0.0278],
          [15.00, 0.0432, 0.0305]
        ]
      }
    ],
    gpTable: [
      { energyMev: 0.050, b: 1.090, c: 0.450, a: 0.185, Xk: 14.0, d: -0.100 },
      { energyMev: 0.088, b: 1.490, c: 1.120, a: -0.005, Xk: 13.1, d: 0.005 },
      { energyMev: 0.100, b: 1.290, c: 0.590, a: 0.130, Xk: 13.7, d: -0.060 },
      { energyMev: 0.200, b: 1.380, c: 0.680, a: 0.098, Xk: 13.8, d: -0.045 },
      { energyMev: 0.500, b: 1.480, c: 0.840, a: 0.052, Xk: 13.9, d: -0.025 },
      { energyMev: 0.662, b: 1.520, c: 0.910, a: 0.034, Xk: 13.9, d: -0.018 },
      { energyMev: 1.000, b: 1.560, c: 1.010, a: 0.012, Xk: 13.8, d: -0.010 },
      { energyMev: 1.250, b: 1.570, c: 1.045, a: 0.005, Xk: 13.7, d: -0.008 },
      { energyMev: 2.000, b: 1.560, c: 1.090, a: -0.002, Xk: 13.6, d: -0.006 },
      { energyMev: 6.000, b: 1.370, c: 1.160, a: -0.010, Xk: 13.3, d: -0.008 },
      { energyMev: 10.00, b: 1.270, c: 1.220, a: -0.014, Xk: 13.1, d: -0.007 }
    ],
    bergerA: 0.58,
    bergerB: 0.025
  }
};

/**
 * Evaluates NIST XCOM mass attenuation (mu/rho) and mass energy-absorption (mu_en/rho)
 * using piecewise log-log interpolation that strictly respects K- and L-shell discontinuities.
 */
export function evaluateXCOMAttenuation(
  materialKey: string,
  energyMev: number
): {
  muLinear: number;
  muMass: number;
  muEnMass: number;
  density: number;
  effectiveZ: number;
  activeEdgeNote: string | null;
} {
  const mat = XCOM_GP_MATERIALS[materialKey] || XCOM_GP_MATERIALS.LEAD;
  const e = Math.max(0.010, Math.min(15.0, energyMev));

  // Locate segment containing energy e (if exactly on an edge, take the upper-shell branch)
  let seg = mat.segments[mat.segments.length - 1];
  for (let i = 0; i < mat.segments.length; i++) {
    const candidate = mat.segments[i];
    if (e >= candidate.minEnergyMev && e < candidate.maxEnergyMev) {
      seg = candidate;
      break;
    }
  }

  const pts = seg.points;
  let idx = 0;
  while (idx < pts.length - 2 && pts[idx + 1][0] < e) {
    idx++;
  }

  const [e0, mu0, muEn0] = pts[idx];
  const [e1, mu1, muEn1] = pts[Math.min(pts.length - 1, idx + 1)];

  let muMass = mu0;
  let muEnMass = muEn0;
  if (e1 > e0 && mu0 > 0 && mu1 > 0) {
    const frac = (Math.log(e) - Math.log(e0)) / (Math.log(e1) - Math.log(e0));
    const clampedFrac = Math.max(0, Math.min(1, frac));
    muMass = Math.exp(Math.log(mu0) + clampedFrac * (Math.log(mu1) - Math.log(mu0)));
    muEnMass = Math.exp(Math.log(muEn0) + clampedFrac * (Math.log(muEn1) - Math.log(muEn0)));
  }

  // Check if energy is within ±15% of an absorption edge for engineering advisory
  let activeEdgeNote: string | null = null;
  for (const edge of mat.edges) {
    if (Math.abs(e - edge.energyMev) / edge.energyMev <= 0.18) {
      activeEdgeNote = `${mat.symbol} ${edge.shell}-Edge (${(edge.energyMev * 1000).toFixed(2)} keV): μ/ρ jumps ${edge.jumpRatio.toFixed(2)}× (${edge.muMassBelow} → ${edge.muMassAbove} cm²/g)`;
      break;
    }
  }

  return {
    muLinear: muMass * mat.density,
    muMass,
    muEnMass,
    density: mat.density,
    effectiveZ: mat.effectiveZ,
    activeEdgeNote
  };
}

/**
 * Interpolates the 5 ANSI/ANS-6.4.3 Geometric Progression (GP) parameters (b, c, a, Xk, d)
 * at arbitrary photon energy E (MeV).
 */
export function getGPParameters(materialKey: string, energyMev: number): GPParameterRow {
  const mat = XCOM_GP_MATERIALS[materialKey] || XCOM_GP_MATERIALS.LEAD;
  const table = mat.gpTable;
  const e = Math.max(table[0].energyMev, Math.min(table[table.length - 1].energyMev, energyMev));

  let idx = 0;
  while (idx < table.length - 2 && table[idx + 1].energyMev < e) {
    idx++;
  }

  const r0 = table[idx];
  const r1 = table[Math.min(table.length - 1, idx + 1)];
  if (r1.energyMev <= r0.energyMev) return { ...r0, energyMev: e };

  const frac = (Math.log(e) - Math.log(r0.energyMev)) / (Math.log(r1.energyMev) - Math.log(r0.energyMev));
  const f = Math.max(0, Math.min(1, frac));

  return {
    energyMev: e,
    b: r0.b + f * (r1.b - r0.b),
    c: r0.c + f * (r1.c - r0.c),
    a: r0.a + f * (r1.a - r0.a),
    Xk: r0.Xk + f * (r1.Xk - r0.Xk),
    d: r0.d + f * (r1.d - r0.d)
  };
}

/**
 * Evaluates the ANSI/ANS-6.4.3-1991 Geometric Progression (GP) Buildup Factor B(E, x)
 * for optical thickness x (in mean free paths, up to 40 mfp).
 */
export function evaluateGPBuildup(
  materialKey: string,
  energyMev: number,
  mfp: number
): {
  B: number;
  K: number;
  params: GPParameterRow;
} {
  const params = getGPParameters(materialKey, energyMev);
  if (mfp <= 0) {
    return { B: 1.0, K: 1.0, params };
  }

  // Clamp mfp to valid ANS-6.4.3 domain [0, 40] with smooth asymptotic extrapolation above 40 mfp
  const x = Math.min(40.0, mfp);
  const { b, c, a, Xk, d } = params;

  const tanhNeg2 = Math.tanh(-2.0); // ≈ -0.96402758
  const xi = (Math.tanh(x / Xk - 2.0) - tanhNeg2) / (1.0 - tanhNeg2);
  const K = c * Math.pow(Math.max(1e-4, x), a) + d * xi;

  let B = 1.0;
  if (Math.abs(K - 1.0) < 1e-5) {
    B = 1.0 + (b - 1.0) * x;
  } else {
    B = 1.0 + ((b - 1.0) * (Math.pow(Math.max(0.05, K), x) - 1.0)) / (K - 1.0);
  }

  // If mfp > 40, apply Harima asymptotic power scaling
  if (mfp > 40.0) {
    B = B * Math.pow(mfp / 40.0, 1.15);
  }

  return {
    B: Math.max(1.0, B),
    K,
    params
  };
}

/**
 * Evaluates single-layer buildup factor according to selected model.
 */
export function evaluateBuildupByModel(
  materialKey: string,
  energyMev: number,
  mfp: number,
  model: BuildupModelType
): number {
  if (model === 'NARROW_BEAM' || mfp <= 0) return 1.0;

  if (model === 'GP_ANS643') {
    return evaluateGPBuildup(materialKey, energyMev, mfp).B;
  }

  const mat = XCOM_GP_MATERIALS[materialKey] || XCOM_GP_MATERIALS.LEAD;
  const gp = getGPParameters(materialKey, energyMev);

  if (model === 'BERGER') {
    // Energy-scaled Berger formula anchored at 1 mfp (b - 1)
    const aBerger = Math.max(0.02, gp.b - 1.0);
    const bBerger = mat.bergerB;
    return Math.max(1.0, 1.0 + aBerger * mfp * Math.exp(bBerger * Math.min(25, mfp)));
  }

  // TAYLOR 2-exponential form
  const A1 = Math.max(1.2, (gp.b - 1.0) * 6.5);
  const alpha1 = -0.065 * (gp.c || 1.0);
  const alpha2 = 0.085;
  return Math.max(
    1.0,
    A1 * Math.exp(-alpha1 * Math.min(25, mfp)) + (1.0 - A1) * Math.exp(-alpha2 * Math.min(25, mfp))
  );
}

/**
 * Evaluates Broder / Kalos Multi-Layer Laminated Shield Buildup Factor B_multi.
 *
 * Captures the physical order dependence of stratified shields:
 * - Low-Z followed by High-Z (e.g. Concrete -> Lead): Low-energy Compton photons built up in Concrete
 *   are strongly photoelectrically absorbed in the downstream Lead layer, suppressing total buildup.
 * - High-Z followed by Low-Z (e.g. Lead -> Concrete): Photons emerging from Lead undergo extensive
 *   Compton scattering in the downstream Concrete layer, yielding a much higher exit buildup factor.
 */
export function evaluateMultiLayerBuildup(
  layers: { materialKey: string; mfp: number }[],
  energyMev: number,
  model: BuildupModelType
): {
  totalBuildup: number;
  cumulativeMfpByLayer: number[];
  effectiveBuildupAtLayerExit: number[];
} {
  if (layers.length === 0 || model === 'NARROW_BEAM') {
    return {
      totalBuildup: 1.0,
      cumulativeMfpByLayer: layers.map(() => 0),
      effectiveBuildupAtLayerExit: layers.map(() => 1.0)
    };
  }

  const cumulativeMfpByLayer: number[] = [];
  const effectiveBuildupAtLayerExit: number[] = [];

  let tauPrev = 0;
  let bPrev = 1.0;

  for (let i = 0; i < layers.length; i++) {
    const { materialKey, mfp } = layers[i];
    const tauCurr = tauPrev + mfp;
    cumulativeMfpByLayer.push(tauCurr);

    const bCurrAtTotal = evaluateBuildupByModel(materialKey, energyMev, tauCurr, model);
    if (i === 0) {
      bPrev = bCurrAtTotal;
      effectiveBuildupAtLayerExit.push(bPrev);
      tauPrev = tauCurr;
      continue;
    }

    const bCurrAtPrev = evaluateBuildupByModel(materialKey, energyMev, tauPrev, model);
    const zPrev = (XCOM_GP_MATERIALS[layers[i - 1].materialKey] || XCOM_GP_MATERIALS.CONCRETE).effectiveZ;
    const zCurr = (XCOM_GP_MATERIALS[materialKey] || XCOM_GP_MATERIALS.LEAD).effectiveZ;

    // Kalos interface transmission factor for upstream scattered spectrum entering layer i
    let kalosAttenuation = 1.0;
    if (zCurr > zPrev + 10) {
      // Upstream low-Z scatter entering downstream high-Z absorber is attenuated with relaxation length ~1.4 mfp
      kalosAttenuation = Math.exp(-mfp / 1.4);
    } else if (zPrev > zCurr + 10) {
      // Upstream high-Z entering downstream low-Z scatterer builds up rapidly
      kalosAttenuation = 1.0;
    }

    const bCombined = Math.max(1.0, bCurrAtTotal + (bPrev - bCurrAtPrev) * kalosAttenuation);
    bPrev = bCombined;
    effectiveBuildupAtLayerExit.push(bCombined);
    tauPrev = tauCurr;
  }

  return {
    totalBuildup: bPrev,
    cumulativeMfpByLayer,
    effectiveBuildupAtLayerExit
  };
}

/**
 * Solves I_0 * B(E, mu*x) * exp(-mu*x) = I_target for exact required shield thickness x (cm)
 * using 60-iteration bisection on optical depth (mfp).
 */
export function solveBroadBeamThicknessCm(
  materialKey: string,
  energyMev: number,
  requiredAttenuationRatio: number,
  model: BuildupModelType
): {
  thicknessCm: number;
  opticalMfp: number;
  buildupAtSolution: number;
} {
  const { muLinear } = evaluateXCOMAttenuation(materialKey, energyMev);
  if (requiredAttenuationRatio <= 1.0 || muLinear <= 0) {
    return { thicknessCm: 0, opticalMfp: 0, buildupAtSolution: 1.0 };
  }

  const narrowMfp = Math.log(requiredAttenuationRatio);
  if (model === 'NARROW_BEAM') {
    return {
      thicknessCm: narrowMfp / muLinear,
      opticalMfp: narrowMfp,
      buildupAtSolution: 1.0
    };
  }

  let low = narrowMfp;
  let high = Math.max(narrowMfp * 2.5 + 4.0, 40.0);

  for (let iter = 0; iter < 60; iter++) {
    const mid = 0.5 * (low + high);
    const B = evaluateBuildupByModel(materialKey, energyMev, mid, model);
    const netAttenuation = Math.exp(mid) / B;
    if (netAttenuation < requiredAttenuationRatio) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const opticalMfp = 0.5 * (low + high);
  const buildupAtSolution = evaluateBuildupByModel(materialKey, energyMev, opticalMfp, model);
  return {
    thicknessCm: opticalMfp / muLinear,
    opticalMfp,
    buildupAtSolution
  };
}
