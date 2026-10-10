import incidentsDataRaw from '../data/historical_incidents_database.json';
import globalRegisterDataRaw from '../data/global_incidents_register.json';
import { type CalculationDossierPayload } from './auditDossierService';

export interface HistoricalIncidentRecord {
  id: string;
  name: string;
  year: number;
  date: string;
  location: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  inesLevel: number;
  eventType: string;
  primaryIsotope: string;
  radionuclides: string[];
  estimatedActivityTBq: number;
  estimatedActivityCi: number;
  physicalForm: string;
  peakContactDoseRate_Gy_h: number;
  fatalities: number;
  arsCases: number;
  peopleScreened: number;
  evacuees: number;
  summary: string;
  chronology: string[];
  rootCauses: string[];
  healthPhysicsImpact: string;
  medicalResponse: {
    decorporationAgents: string[];
    treatmentProtocols: string;
    biodosimetryMethods: string[];
  };
  regulatoryReforms: string[];
  iaeaReportReference: string;
  relatedModules: {
    modulePath: string;
    moduleName: string;
    actionPrompt: string;
  }[];
}

export interface GlobalIncidentRegisterRecord {
  id: string;
  date: string | null;
  year: number | null;
  title: string;
  country: string;
  location: string;
  classification: string;
  ines: number | null;
  eventType: string;
  highestDoseRem: string | null;
  deaths: number;
  injuries: number;
  publicInvolved: string | null;
  radionuclide: string | null;
  release: string | null;
  description: string;
  url: string | null;
  source: string;
  isNearMiss: boolean;
  dossierId: string | null;
}

const HISTORICAL_INCIDENTS: HistoricalIncidentRecord[] = incidentsDataRaw as HistoricalIncidentRecord[];
const GLOBAL_REGISTER_INCIDENTS: GlobalIncidentRegisterRecord[] = globalRegisterDataRaw as GlobalIncidentRegisterRecord[];

export function getAllHistoricalIncidents(): HistoricalIncidentRecord[] {
  return HISTORICAL_INCIDENTS;
}

export function getIncidentById(id: string): HistoricalIncidentRecord | undefined {
  return HISTORICAL_INCIDENTS.find((i) => i.id === id);
}

export interface IncidentFilterOptions {
  searchQuery?: string;
  inesLevel?: number | 'all';
  eventType?: string | 'all';
  primaryIsotope?: string | 'all';
  fatalitiesOnly?: boolean;
}

export function filterHistoricalIncidents(options: IncidentFilterOptions): HistoricalIncidentRecord[] {
  return HISTORICAL_INCIDENTS.filter((item) => {
    // INES Level Filter
    if (options.inesLevel && options.inesLevel !== 'all') {
      if (item.inesLevel !== options.inesLevel) return false;
    }

    // Event Type Filter
    if (options.eventType && options.eventType !== 'all') {
      if (!item.eventType.toLowerCase().includes(options.eventType.toLowerCase())) return false;
    }

    // Primary Isotope Filter
    if (options.primaryIsotope && options.primaryIsotope !== 'all') {
      const match = item.radionuclides.some(r => r.toLowerCase().includes(options.primaryIsotope!.toLowerCase())) ||
        item.primaryIsotope.toLowerCase().includes(options.primaryIsotope!.toLowerCase());
      if (!match) return false;
    }

    // Fatalities Only
    if (options.fatalitiesOnly && item.fatalities <= 0) {
      return false;
    }

    // Search Query (Full Text)
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const q = options.searchQuery.toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.primaryIsotope.toLowerCase().includes(q) ||
        item.eventType.toLowerCase().includes(q) ||
        item.rootCauses.some(rc => rc.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });
}

export function getAllGlobalRegisterIncidents(): GlobalIncidentRegisterRecord[] {
  return GLOBAL_REGISTER_INCIDENTS;
}

export function getGlobalRegisterIncidentById(id: string): GlobalIncidentRegisterRecord | undefined {
  return GLOBAL_REGISTER_INCIDENTS.find(i => i.id === id);
}

export interface GlobalFilterOptions {
  searchQuery?: string;
  classification?: 'all' | 'incident' | 'near_miss';
  inesLevel?: number | 'all' | 'unrated';
  decade?: number | 'all';
  country?: string | 'all';
  fatalitiesOnly?: boolean;
  source?: string | 'all';
}

export function filterGlobalRegisterIncidents(options: GlobalFilterOptions): GlobalIncidentRegisterRecord[] {
  return GLOBAL_REGISTER_INCIDENTS.filter(item => {
    // Classification Filter
    if (options.classification === 'near_miss' && !item.isNearMiss) {
      return false;
    }
    if (options.classification === 'incident' && item.isNearMiss) {
      return false;
    }

    // INES Level Filter
    if (options.inesLevel !== undefined && options.inesLevel !== 'all') {
      if (options.inesLevel === 'unrated') {
        if (item.ines !== null) return false;
      } else {
        if (item.ines !== options.inesLevel) return false;
      }
    }

    // Decade Filter
    if (options.decade !== undefined && options.decade !== 'all') {
      if (!item.year) return false;
      const itemDecade = Math.floor(item.year / 10) * 10;
      if (itemDecade !== options.decade) return false;
    }

    // Country Filter
    if (options.country && options.country !== 'all') {
      if (item.country.toLowerCase() !== options.country.toLowerCase()) return false;
    }

    // Fatalities Only
    if (options.fatalitiesOnly && item.deaths <= 0) {
      return false;
    }

    // Source Filter
    if (options.source && options.source !== 'all') {
      if (!item.source.toLowerCase().includes(options.source.toLowerCase())) return false;
    }

    // Search Query (Full Text)
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const q = options.searchQuery.toLowerCase();
      const match =
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.country.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.radionuclide && item.radionuclide.toLowerCase().includes(q)) ||
        (item.eventType && item.eventType.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });
}

export function getGlobalRegisterCountries(): string[] {
  const set = new Set<string>();
  GLOBAL_REGISTER_INCIDENTS.forEach(r => {
    if (r.country && r.country !== 'Unknown') set.add(r.country);
  });
  return Array.from(set).sort();
}

export function getGlobalRegisterDecades(): number[] {
  const set = new Set<number>();
  GLOBAL_REGISTER_INCIDENTS.forEach(r => {
    if (r.year) set.add(Math.floor(r.year / 10) * 10);
  });
  return Array.from(set).sort((a, b) => b - a);
}

export interface GlobalRegisterStats {
  totalCount: number;
  nearMissCount: number;
  fatalitiesEventsCount: number;
  totalDeaths: number;
  totalInjuries: number;
  inesCounts: Record<number, number>;
  unratedCount: number;
  countriesCount: number;
}

export function getGlobalRegisterStats(): GlobalRegisterStats {
  let nearMissCount = 0;
  let fatalitiesEventsCount = 0;
  let totalDeaths = 0;
  let totalInjuries = 0;
  const inesCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  let unratedCount = 0;
  const countries = new Set<string>();

  GLOBAL_REGISTER_INCIDENTS.forEach(r => {
    if (r.isNearMiss) nearMissCount++;
    if (r.deaths > 0) {
      fatalitiesEventsCount++;
      totalDeaths += r.deaths;
    }
    totalInjuries += r.injuries;
    if (r.ines !== null && r.ines >= 0 && r.ines <= 7) {
      inesCounts[r.ines]++;
    } else {
      unratedCount++;
    }
    if (r.country && r.country !== 'Unknown') {
      countries.add(r.country);
    }
  });

  return {
    totalCount: GLOBAL_REGISTER_INCIDENTS.length,
    nearMissCount,
    fatalitiesEventsCount,
    totalDeaths,
    totalInjuries,
    inesCounts,
    unratedCount,
    countriesCount: countries.size
  };
}

/**
 * Creates a tamper-evident 21 CFR Part 11 / ISO 17025 SHA-256 calculation dossier payload
 * for forensic incident reviews and regulatory audit trails.
 */
export function buildIncidentDossierPayload(
  incident: HistoricalIncidentRecord,
  operatorName: string = 'Senior Health Physicist & Forensic Investigator',
  facility: string = 'RadPro Forensic Historical Archive'
): CalculationDossierPayload {
  return {
    reportTitle: `Historical Radiation Incident Forensic Dossier: ${incident.name}`,
    moduleName: 'Historical Radiation Incidents Database',
    statuteCitation: `${incident.iaeaReportReference} / IAEA INES Level ${incident.inesLevel}`,
    verificationTestId: 'VTEST-28 / IAEA-INES',
    operatorName,
    operatorCredentials: 'Certified Health Physicist (CHP) / Forensic Nuclear Investigator',
    facility,
    notes: `Forensic audit of ${incident.name} (${incident.date}, ${incident.location}). Primary isotopes: ${incident.primaryIsotope}. Total estimated release: ${incident.estimatedActivityTBq.toLocaleString()} TBq (${incident.estimatedActivityCi.toLocaleString()} Ci).`,
    formulaDescription: 'R(t) = R_1 \\cdot t^{-1.2}, \\quad D = \\frac{-\\alpha + \\sqrt{\\alpha^2 - 4\\beta(c - Y)}}{2\\beta}, \\quad \\text{INES Level: } ' + incident.inesLevel,
    inputs: [
      { label: 'Incident Name', value: incident.name },
      { label: 'Occurrence Date', value: incident.date },
      { label: 'Geographic Location', value: incident.location },
      { label: 'Coordinates', value: `${incident.coordinates.lat.toFixed(4)}°N, ${incident.coordinates.lon.toFixed(4)}°E` },
      { label: 'Event Classification', value: incident.eventType },
      { label: 'Primary Isotope(s)', value: incident.primaryIsotope },
      { label: 'Estimated Activity', value: incident.estimatedActivityTBq.toLocaleString(), unit: 'TBq' },
      { label: 'Activity in Curies', value: incident.estimatedActivityCi.toLocaleString(), unit: 'Ci' },
      { label: 'Physical Form', value: incident.physicalForm }
    ],
    outputs: [
      { label: 'IAEA INES Severity Level', value: `Level ${incident.inesLevel}`, status: incident.inesLevel >= 5 ? 'WARNING' : 'PASS' },
      { label: 'Peak Field / Contact Dose Rate', value: incident.peakContactDoseRate_Gy_h.toString(), unit: 'Gy/h', status: incident.peakContactDoseRate_Gy_h > 1.0 ? 'WARNING' : 'PASS' },
      { label: 'Confirmed Fatalities', value: incident.fatalities, status: incident.fatalities > 0 ? 'WARNING' : 'PASS' },
      { label: 'Acute Radiation Syndrome (ARS) Cases', value: incident.arsCases, status: incident.arsCases > 0 ? 'WARNING' : 'PASS' },
      { label: 'Population Evacuated', value: incident.evacuees.toLocaleString(), unit: 'Persons' },
      { label: 'Medical Countermeasures Deployed', value: incident.medicalResponse.decorporationAgents.join(', ') || 'None' }
    ]
  };
}

/**
 * Creates a tamper-evident 21 CFR Part 11 / ISO 17025 SHA-256 calculation dossier payload
 * for records from the Global Incident & Near-Miss Register.
 */
export function buildGlobalIncidentDossierPayload(
  record: GlobalIncidentRegisterRecord,
  operatorName: string = 'Senior Health Physicist & Forensic Investigator',
  facility: string = 'RadPro Global Incident Register'
): CalculationDossierPayload {
  const inesLabel = record.ines !== null ? `INES Level ${record.ines}` : 'INES Unrated / National Occurrence';
  return {
    reportTitle: `Global Incident Register Record: [${record.id}] ${record.title}`,
    moduleName: 'Global Radiological Incident & Near-Miss Register',
    statuteCitation: `${record.source} / ${inesLabel}`,
    verificationTestId: 'VTEST-28 / IAEA-NEWS',
    operatorName,
    operatorCredentials: 'Certified Health Physicist (CHP) / Radiation Safety Officer',
    facility,
    notes: `Incident Record [${record.id}] occurred in ${record.country} (${record.date || record.year || 'Unknown Date'}). Classification: ${record.classification}. Primary source: ${record.url || 'Official IAEA Archive'}.`,
    formulaDescription: 'IAEA INES Scale (Levels 0-7) / IAEA Safety Standards Series No. GSR Part 7',
    inputs: [
      { label: 'Record ID', value: record.id },
      { label: 'Event Title', value: record.title },
      { label: 'Date Reported', value: record.date || (record.year ? record.year.toString() : 'Unknown') },
      { label: 'Country', value: record.country },
      { label: 'Facility / Location', value: record.location || 'Not Specified' },
      { label: 'Classification', value: record.classification },
      { label: 'Event or Activity Type', value: record.eventType || 'General Facility Operation' },
      { label: 'Radionuclide / Source', value: record.radionuclide || 'Unspecified' },
      { label: 'Dataset Source', value: record.source }
    ],
    outputs: [
      { label: 'IAEA INES Level', value: record.ines !== null ? `Level ${record.ines}` : 'Unrated', status: record.ines && record.ines >= 4 ? 'WARNING' : 'PASS' },
      { label: 'Reported Deaths', value: record.deaths, status: record.deaths > 0 ? 'WARNING' : 'PASS' },
      { label: 'Reported Injuries', value: record.injuries, status: record.injuries > 0 ? 'WARNING' : 'PASS' },
      { label: 'Near Miss / Precursor', value: record.isNearMiss ? 'YES (Near Miss / Safety-Significant Deviation)' : 'NO (Incident / Casualty Event)', status: record.isNearMiss ? 'WARNING' : 'PASS' },
      { label: 'Highest Dose (Reported)', value: record.highestDoseRem ? `${record.highestDoseRem} rem` : 'Not Reported' },
      { label: 'Release Characterization', value: record.release || 'None Reported / Contained' }
    ]
  };
}

