import reactorsDataRaw from '../data/global_reactors_database.json';
import detonationsDataRaw from '../data/nuclear_detonations_database.json';
import incidentsDataRaw from '../data/historical_incidents_database.json';
import { type CalculationDossierPayload } from './auditDossierService';

export interface GlobalReactorRecord {
  id: string;
  name: string;
  country: string;
  region: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  type: string;
  status: 'Operational' | 'Permanent Shutdown' | 'Under Construction';
  capacityMWe: number;
  thermalMWth: number;
  unitsCount: number;
  firstGridYear: number;
  operator: string;
  fissionInventoryTBq: {
    I131: number;
    Cs137: number;
    Xe133: number;
  };
  notes: string;
}

export interface NuclearDetonationRecord {
  id: string;
  name: string;
  country: string;
  location: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  date: string;
  year: number;
  yieldKt: number;
  yieldDisplay: string;
  testType: string;
  purpose: string;
  heightOfBurstM: number;
  fireballRadiusM: number;
  promptEffects: {
    thermalRadiusKm_3rdDeg: number;
    blast5psiRadiusKm: number;
    promptRadiation1SvRadiusKm: number;
  };
  historicalSignificance: string;
}

export type GeospatialCategory = 'reactor' | 'detonation' | 'incident';

export interface UnifiedGeospatialPin {
  id: string;
  category: GeospatialCategory;
  name: string;
  country: string;
  location: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  primaryMetric: string;
  secondaryMetric: string;
  dateOrYear: string;
  typeOrClassification: string;
  color: string;
  symbol: string;
  rawReactor?: GlobalReactorRecord;
  rawDetonation?: NuclearDetonationRecord;
  rawIncident?: any;
}

const REACTORS: GlobalReactorRecord[] = reactorsDataRaw as GlobalReactorRecord[];
const DETONATIONS: NuclearDetonationRecord[] = detonationsDataRaw as NuclearDetonationRecord[];
const INCIDENTS: any[] = incidentsDataRaw as any[];

export function getAllReactors(): GlobalReactorRecord[] {
  return REACTORS;
}

export function getAllDetonations(): NuclearDetonationRecord[] {
  return DETONATIONS;
}

export function getAllIncidentsWithCoords(): any[] {
  return INCIDENTS.filter(i => i.coordinates && typeof i.coordinates.lat === 'number');
}

/**
 * Great-circle distance between two geographic coordinates using Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0; // Mean Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2.0) *
      Math.sin(dLon / 2.0);
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return R * c;
}

export interface GeospatialFilterOptions {
  includeReactors?: boolean;
  includeDetonations?: boolean;
  includeIncidents?: boolean;
  searchQuery?: string;
  country?: string | 'all';
  status?: string | 'all';
}

export function getUnifiedGeospatialPins(options: GeospatialFilterOptions = {}): UnifiedGeospatialPin[] {
  const {
    includeReactors = true,
    includeDetonations = true,
    includeIncidents = true,
    searchQuery = '',
    country = 'all'
  } = options;

  const pins: UnifiedGeospatialPin[] = [];
  const q = searchQuery.toLowerCase().trim();

  // 1. Process Reactors
  if (includeReactors) {
    REACTORS.forEach(r => {
      if (country !== 'all' && r.country.toLowerCase() !== country.toLowerCase()) return;
      if (q) {
        const match =
          r.name.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q);
        if (!match) return;
      }

      pins.push({
        id: r.id,
        category: 'reactor',
        name: r.name,
        country: r.country,
        location: `${r.region}, ${r.country}`,
        coordinates: r.coordinates,
        primaryMetric: `${r.capacityMWe.toLocaleString()} MWe (${r.thermalMWth.toLocaleString()} MWth)`,
        secondaryMetric: `${r.unitsCount} Units // ${r.status}`,
        dateOrYear: `Grid: ${r.firstGridYear}`,
        typeOrClassification: r.type,
        color: r.status === 'Operational' ? '#10b981' : r.status === 'Under Construction' ? '#38bdf8' : '#64748b',
        symbol: 'circle',
        rawReactor: r
      });
    });
  }

  // 2. Process Detonations & Test Sites
  if (includeDetonations) {
    DETONATIONS.forEach(d => {
      if (country !== 'all' && d.country.toLowerCase() !== country.toLowerCase()) return;
      if (q) {
        const match =
          d.name.toLowerCase().includes(q) ||
          d.country.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          d.historicalSignificance.toLowerCase().includes(q);
        if (!match) return;
      }

      pins.push({
        id: d.id,
        category: 'detonation',
        name: d.name,
        country: d.country,
        location: d.location,
        coordinates: d.coordinates,
        primaryMetric: `Yield: ${d.yieldDisplay}`,
        secondaryMetric: `${d.testType} // ${d.purpose}`,
        dateOrYear: d.date,
        typeOrClassification: d.testType,
        color: d.yieldKt >= 1000 ? '#ef4444' : '#f97316',
        symbol: 'diamond',
        rawDetonation: d
      });
    });
  }

  // 3. Process Landmark Incidents
  if (includeIncidents) {
    INCIDENTS.forEach(inc => {
      if (!inc.coordinates || typeof inc.coordinates.lat !== 'number') return;
      if (country !== 'all' && !inc.location.toLowerCase().includes(country.toLowerCase())) return;
      if (q) {
        const match =
          inc.name.toLowerCase().includes(q) ||
          inc.location.toLowerCase().includes(q) ||
          inc.summary.toLowerCase().includes(q) ||
          inc.primaryIsotope.toLowerCase().includes(q);
        if (!match) return;
      }

      pins.push({
        id: inc.id,
        category: 'incident',
        name: inc.name,
        country: inc.location.split(',').pop()?.trim() || 'Global',
        location: inc.location,
        coordinates: inc.coordinates,
        primaryMetric: `INES Level ${inc.inesLevel}`,
        secondaryMetric: `${inc.fatalities} Fatalities // ${inc.primaryIsotope}`,
        dateOrYear: inc.date,
        typeOrClassification: inc.eventType,
        color: inc.inesLevel >= 7 ? '#ef4444' : inc.inesLevel >= 5 ? '#f59e0b' : '#00e5ff',
        symbol: 'cross',
        rawIncident: inc
      });
    });
  }

  return pins;
}

export function getGeospatialCountries(): string[] {
  const set = new Set<string>();
  REACTORS.forEach(r => set.add(r.country));
  DETONATIONS.forEach(d => set.add(d.country));
  return Array.from(set).sort();
}

/**
 * Creates a sealed 21 CFR Part 11 / ISO 17025 SHA-256 calculation dossier payload
 * for geographic facility surveys and nuclear test site verifications.
 */
export function buildGeospatialDossierPayload(
  pin: UnifiedGeospatialPin,
  operatorName: string = 'Senior Geospatial Intelligence & Health Physics Analyst',
  facility: string = 'RadPro Global Geospatial Observatory'
): CalculationDossierPayload {
  const isReactor = pin.category === 'reactor' && pin.rawReactor;
  const isDetonation = pin.category === 'detonation' && pin.rawDetonation;

  return {
    reportTitle: `Global Nuclear Facility & Detonation Dossier: ${pin.name}`,
    moduleName: 'Global Nuclear Geospatial & 3D Earth Hub',
    statuteCitation: isReactor ? 'IAEA PRIS / IAEA Safety Standards GSR Part 7' : 'CTBTO / Glasstone & Dolan Nuclear Weapon Effects',
    verificationTestId: 'VTEST-28 / IAEA-GEOSPATIAL',
    operatorName,
    operatorCredentials: 'Certified Health Physicist (CHP) / Nuclear Geospatial Analyst',
    facility,
    notes: `Geographic inspection and radiological source characterization of [${pin.id}] located at ${pin.location} (${pin.coordinates.lat.toFixed(4)}°N, ${pin.coordinates.lon.toFixed(4)}°E). Category: ${pin.category.toUpperCase()}.`,
    formulaDescription: 'Haversine Great-Circle Metric: d = 2R \\cdot \\arcsin\\left(\\sqrt{\\sin^2(\\Delta\\phi/2) + \\cos(\\phi_1)\\cos(\\phi_2)\\sin^2(\\Delta\\lambda/2)}\\right)',
    inputs: [
      { label: 'Facility / Event Name', value: pin.name },
      { label: 'Category', value: pin.category.toUpperCase() },
      { label: 'Coordinates', value: `${pin.coordinates.lat.toFixed(4)}°N, ${pin.coordinates.lon.toFixed(4)}°E` },
      { label: 'Country / Sovereign State', value: pin.country },
      { label: 'Classification', value: pin.typeOrClassification },
      { label: 'Occurrence / Grid Date', value: pin.dateOrYear }
    ],
    outputs: [
      { label: 'Primary Operational Metric', value: pin.primaryMetric, status: 'PASS' as const },
      { label: 'Secondary Specification', value: pin.secondaryMetric, status: 'PASS' as const },
      ...(isReactor ? [
        { label: 'Thermal Capacity', value: `${pin.rawReactor!.thermalMWth.toLocaleString()} MWth` },
        { label: 'Net Electric Capacity', value: `${pin.rawReactor!.capacityMWe.toLocaleString()} MWe` },
        { label: 'Equilibrium I-131 Core Inventory', value: `${(pin.rawReactor!.fissionInventoryTBq.I131 / 1e6).toFixed(1)}M TBq` }
      ] : []),
      ...(isDetonation ? [
        { label: 'Estimated Total Yield', value: pin.rawDetonation!.yieldDisplay, status: (pin.rawDetonation!.yieldKt >= 1000 ? 'WARNING' : 'PASS') as 'WARNING' | 'PASS' },
        { label: 'Fireball Maximum Radius', value: `${pin.rawDetonation!.fireballRadiusM} meters` },
        { label: '5-psi Moderate Blast Damage Radius', value: `${pin.rawDetonation!.promptEffects.blast5psiRadiusKm} km` },
        { label: '3rd Degree Thermal Burn Radius', value: `${pin.rawDetonation!.promptEffects.thermalRadiusKm_3rdDeg} km` }
      ] : [])
    ]
  };
}
