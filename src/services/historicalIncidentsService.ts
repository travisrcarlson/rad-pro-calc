import incidentsDataRaw from '../data/historical_incidents_database.json';
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

const HISTORICAL_INCIDENTS: HistoricalIncidentRecord[] = incidentsDataRaw as HistoricalIncidentRecord[];

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
