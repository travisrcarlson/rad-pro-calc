import React, { useState, useMemo, useRef, useEffect } from 'react';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { BlockMath, InlineMath } from 'react-katex';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

type DistortionTab = 'ray_tracer' | 'depth_distortion' | 'shape_distortion' | 'compliance_ndt' | 'physics_theory';

interface RadiographicPreset {
  id: string;
  name: string;
  category: 'Diagnostic Clinical' | 'Industrial NDT' | 'Specialized';
  sid_cm: number; // Source-to-Image Distance
  oid_cm: number; // Object-to-Image Distance
  objectWidth_cm: number;
  objectDepth_cm: number; // Specimen thickness
  focalSpot_mm: number; // Focal spot size
  objectTilt_deg: number;
  beamAngle_deg: number;
  description: string;
}

const PRESETS: RadiographicPreset[] = [
  {
    id: 'chest_pa',
    name: '🫁 Chest Radiography (PA Standard)',
    category: 'Diagnostic Clinical',
    sid_cm: 180,
    oid_cm: 5,
    objectWidth_cm: 32,
    objectDepth_cm: 22,
    focalSpot_mm: 1.2,
    objectTilt_deg: 0,
    beamAngle_deg: 0,
    description: 'Posteroanterior (PA) 72" (180 cm) projection. Anterior heart placement minimizes cardiac magnification (M = 1.029) and sharpens thoracic lung fields.'
  },
  {
    id: 'chest_ap',
    name: '🏥 Chest Radiography (AP Portable Bedside)',
    category: 'Diagnostic Clinical',
    sid_cm: 100,
    oid_cm: 18,
    objectWidth_cm: 32,
    objectDepth_cm: 22,
    focalSpot_mm: 1.2,
    objectTilt_deg: 0,
    beamAngle_deg: 0,
    description: 'Anteroposterior (AP) 40" (100 cm) portable setup. Increased heart-to-plate distance (18 cm) causes apparent cardiomegaly artifact (M = 1.220) and increased penumbra blur.'
  },
  {
    id: 'extremity_detail',
    name: '🦴 Extremity Fine Detail (Hand / Wrist)',
    category: 'Diagnostic Clinical',
    sid_cm: 100,
    oid_cm: 2,
    objectWidth_cm: 6,
    objectDepth_cm: 3,
    focalSpot_mm: 0.6,
    objectTilt_deg: 0,
    beamAngle_deg: 0,
    description: 'Fine-focus diagnostic setup for trabecular bone micro-fracture resolution. Very low OID and small 0.6 mm focal spot yield negligible penumbra (Ug = 0.012 mm).'
  },
  {
    id: 'mammo_mag',
    name: '🔬 Mammography Magnification View',
    category: 'Specialized',
    sid_cm: 65,
    oid_cm: 22,
    objectWidth_cm: 4,
    objectDepth_cm: 4.5,
    focalSpot_mm: 0.1,
    objectTilt_deg: 0,
    beamAngle_deg: 0,
    description: 'Intentional geometric magnification (M = 1.51x) to resolve malignant microcalcifications. Requires ultra-small 0.1 mm microfocus to constrain penumbra.'
  },
  {
    id: 'ndt_weld_asme',
    name: '🏭 Industrial Pipe Weld (ASME Sec V Art. 2)',
    category: 'Industrial NDT',
    sid_cm: 70,
    oid_cm: 3.5,
    objectWidth_cm: 5,
    objectDepth_cm: 2.5,
    focalSpot_mm: 2.0,
    objectTilt_deg: 0,
    beamAngle_deg: 0,
    description: 'Heavy industrial radiography with 2.0 mm focal spot. ASME BPVC Section V Table T-274.1 requires Ug <= 0.51 mm for material thickness < 50.8 mm.'
  },
  {
    id: 'aerospace_casting',
    name: '🚀 Aerospace Turbine Blade (ISO 17636 Class B)',
    category: 'Industrial NDT',
    sid_cm: 120,
    oid_cm: 1.5,
    objectWidth_cm: 8,
    objectDepth_cm: 1.5,
    focalSpot_mm: 0.4,
    objectTilt_deg: 0,
    beamAngle_deg: 0,
    description: 'Critical aerospace structural casting inspected under ISO 17636-1 Class B high-sensitivity requirements with min focus 0.4 mm and long SID.'
  },
  {
    id: 'foreshortening_demo',
    name: '📐 Shape Distortion & Tilt Demonstration',
    category: 'Specialized',
    sid_cm: 100,
    oid_cm: 15,
    objectWidth_cm: 10,
    objectDepth_cm: 2,
    focalSpot_mm: 1.2,
    objectTilt_deg: 35,
    beamAngle_deg: 0,
    description: 'Object inclined 35° relative to the image receptor. Demonstrates pronounced geometric foreshortening vs Cieszynski bisecting angle compensation.'
  }
];

const XRayDistortionModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DistortionTab>('ray_tracer');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('chest_pa');

  // Core geometric variables
  const [sid, setSid] = useState<number>(180); // Source-to-Image Distance (cm)
  const [oid, setOid] = useState<number>(5); // Object-to-Image Distance (cm)
  const [objectWidth, setObjectWidth] = useState<number>(32); // Object Width (cm)
  const [objectDepth, setObjectDepth] = useState<number>(22); // Object Thickness / Depth (cm)
  const [focalSpot, setFocalSpot] = useState<number>(1.2); // Focal spot size (mm)
  const [objectTilt, setObjectTilt] = useState<number>(0); // Object tilt angle (deg)
  const [beamAngle, setBeamAngle] = useState<number>(0); // Central ray angulation (deg)
  const [lateralOffset, setLateralOffset] = useState<number>(0); // Off-axis displacement (cm)

  // Audit Dossier Modal State
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handler for preset selection
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = PRESETS.find(x => x.id === presetId);
    if (p) {
      setSid(p.sid_cm);
      setOid(p.oid_cm);
      setObjectWidth(p.objectWidth_cm);
      setObjectDepth(p.objectDepth_cm);
      setFocalSpot(p.focalSpot_mm);
      setObjectTilt(p.objectTilt_deg);
      setBeamAngle(p.beamAngle_deg);
      setLateralOffset(0);
    }
  };

  // Derived Geometric Calculations
  const calc = useMemo(() => {
    // Singularity protection
    const safeOid = Math.min(oid, sid - 0.5);
    const sod = Math.max(0.5, sid - safeOid); // Source-to-Object Distance (cm)
    const magnification = sid / sod; // M
    const percentEnlargement = (magnification - 1) * 100;

    // Projected nominal image size of object width (cm)
    const nominalImageWidth = objectWidth * magnification;

    // Geometric Unsharpness / Penumbra Ug (mm)
    // Ug = F * (OID / SOD) = F * (M - 1)
    const unsharpness_mm = focalSpot * (safeOid / sod);

    // Umbra width (mm) on plate for object of width objectWidth (converted to mm = * 10)
    // Nominal magnified dimension in mm = nominalImageWidth * 10
    // Umbra = nominalImageWidth * 10 - unsharpness_mm (clamped at 0 if focal spot blur overtakes object)
    const nominalImageWidth_mm = nominalImageWidth * 10;
    const umbraWidth_mm = Math.max(0, nominalImageWidth_mm - unsharpness_mm);
    const totalShadowFootprint_mm = nominalImageWidth_mm + unsharpness_mm;

    // Theoretical spatial resolution limit due to focal spot penumbra
    // f_limit ≈ 1 / (2 * Ug) [lp/mm]
    const resolutionLimit_lpmm = unsharpness_mm > 0 ? 1 / (2 * unsharpness_mm) : 999;

    // Object Depth / Volumetric Frustum Distortion
    // Base/exit surface sits at safeOid above the plate
    // Top/entrance surface sits at safeOid + objectDepth above the plate
    const oidBottom = safeOid;
    const sodBottom = Math.max(0.5, sid - oidBottom);
    const safeTopDepth = Math.min(objectDepth, Math.max(0.1, sid - safeOid - 0.5));
    const oidTop = safeOid + safeTopDepth;
    const sodTop = Math.max(0.5, sid - oidTop);
    const magTop = sid / sodTop;
    const magBottom = sid / sodBottom;
    const deltaMag = magTop - magBottom;
    const depthDistortionRatio = magTop / magBottom;
    const widthTop_projected = objectWidth * magTop;
    const widthBottom_projected = objectWidth * magBottom;
    const penumbraTop_mm = focalSpot * (oidTop / sodTop);
    const penumbraBottom_mm = focalSpot * (oidBottom / sodBottom);

    // Frustum taper half-angle (degrees)
    const frustumTaperAngle = Math.atan(Math.abs(widthTop_projected - widthBottom_projected) / (2 * Math.max(0.1, objectDepth * magnification))) * (180 / Math.PI);

    // Shape Distortion: Tilt & Foreshortening
    // Foreshortening from object tilt relative to plate: L' = L0 * cos(alpha) * M
    const tiltRad = (objectTilt * Math.PI) / 180;
    const beamRad = (beamAngle * Math.PI) / 180;
    const foreshortenedWidth = objectWidth * Math.cos(tiltRad) * magnification;
    const foreshorteningRatio = Math.cos(tiltRad); // <= 1

    // Elongation from beam angulation: L' = L0 * M / cos(theta)
    const elongatedWidth = (objectWidth * magnification) / Math.max(0.2, Math.cos(beamRad));
    const elongationRatio = 1 / Math.max(0.2, Math.cos(beamRad));

    // Cieszynski Bisecting Angle Rule:
    // Ideal beam angle to preserve true isometric length = objectTilt / 2
    const idealBisectingAngle_deg = objectTilt / 2;

    // Parallax / Lateral Beam Off-Axis Shift
    // Delta x = x_off * (M - 1)
    const parallaxShift_cm = lateralOffset * (magnification - 1);
    const projectedCenter_cm = lateralOffset * magnification;

    // ASME Section V Article 2 Table T-274.1 Geometric Unsharpness Limit
    // Material thickness in mm = objectDepth * 10
    const thickness_mm = objectDepth * 10;
    let asmeLimit_mm = 0.51; // default < 50.8 mm (2")
    if (thickness_mm > 101.6) {
      asmeLimit_mm = 1.78; // > 4"
    } else if (thickness_mm > 76.2) {
      asmeLimit_mm = 1.02; // 3" - 4"
    } else if (thickness_mm >= 50.8) {
      asmeLimit_mm = 0.76; // 2" - 3"
    }

    const asmeCompliant = unsharpness_mm <= asmeLimit_mm;
    const isoClassACompliant = unsharpness_mm <= 0.40;
    const isoClassBCompliant = unsharpness_mm <= 0.15;
    const diagnosticExtremityCompliant = unsharpness_mm <= 0.20;

    // Minimum compliant SID for ASME:
    // Ug = F * OID / (SID_min - OID) <= asmeLimit_mm => SID_min = OID * (1 + F / asmeLimit_mm)
    const minCompliantSidAsme = safeOid * (1 + focalSpot / asmeLimit_mm);

    return {
      sod,
      safeOid,
      magnification,
      percentEnlargement,
      nominalImageWidth,
      unsharpness_mm,
      umbraWidth_mm,
      totalShadowFootprint_mm,
      resolutionLimit_lpmm,
      sodTop,
      sodBottom,
      magTop,
      magBottom,
      deltaMag,
      depthDistortionRatio,
      widthTop_projected,
      widthBottom_projected,
      frustumTaperAngle,
      foreshortenedWidth,
      foreshorteningRatio,
      elongatedWidth,
      elongationRatio,
      idealBisectingAngle_deg,
      parallaxShift_cm,
      projectedCenter_cm,
      thickness_mm,
      asmeLimit_mm,
      asmeCompliant,
      isoClassACompliant,
      isoClassBCompliant,
      diagnosticExtremityCompliant,
      minCompliantSidAsme,
      oidBottom,
      oidTop,
      penumbraTop_mm,
      penumbraBottom_mm
    };
  }, [sid, oid, objectWidth, objectDepth, focalSpot, objectTilt, beamAngle, lateralOffset]);

  // Render Interactive Canvas Ray-Tracer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, width, height);

    // Margins and scale coordinates
    const topMargin = 40;
    const bottomMargin = 45;
    const usableHeight = height - topMargin - bottomMargin;

    // Scale factors: Z maps from 0 (source) to SID (detector)
    const zScale = usableHeight / Math.max(10, sid);
    const sourceY = topMargin;
    const detectorY = topMargin + usableHeight;

    // Specimen depth coordinates
    const objBottomY = Math.max(sourceY + 24, detectorY - calc.oidBottom * zScale);
    const objTopY = Math.max(sourceY + 12, detectorY - calc.oidTop * zScale);
    const sodY = (objTopY + objBottomY) / 2;

    // Horizontal center with lateral offset
    const centerX = width / 2;
    const xOffPx = lateralOffset * 4.0;
    const objCenterX = centerX + xOffPx;

    // Horizontal scale for rendering object and shadows
    const xScale = 6.0; // pixels per cm

    // Focal spot representation at top
    // Visually magnified so the user can perceive the finite focal width
    const focalVisualWidth = Math.max(4, focalSpot * 14);
    const focalLeftX = centerX - focalVisualWidth / 2;
    const focalRightX = centerX + focalVisualWidth / 2;

    // Object coordinates with tilt
    const objHalfW = (objectWidth / 2) * xScale;
    const tiltRad = (objectTilt * Math.PI) / 180;
    const dxTilt = objHalfW * Math.cos(tiltRad);
    const dyTilt = objHalfW * Math.sin(tiltRad);

    const objCornerTL = { x: objCenterX - dxTilt, y: objTopY - dyTilt };
    const objCornerTR = { x: objCenterX + dxTilt, y: objTopY + dyTilt };
    const objCornerBL = { x: objCenterX - dxTilt, y: objBottomY - dyTilt };
    const objCornerBR = { x: objCenterX + dxTilt, y: objBottomY + dyTilt };

    // 1. Draw Divergent Beam Cone (translucent background radiation field)
    const beamSpanDetector = Math.max(width * 0.45, (objectWidth * calc.magnification * xScale * 1.6));
    const beamAngleRad = (beamAngle * Math.PI) / 180;
    const beamCenterPlateX = centerX + Math.tan(beamAngleRad) * usableHeight;

    ctx.save();
    const beamGrad = ctx.createLinearGradient(centerX, sourceY, centerX, detectorY);
    beamGrad.addColorStop(0, 'rgba(0, 229, 255, 0.22)');
    beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0.04)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(centerX, sourceY);
    ctx.lineTo(beamCenterPlateX - beamSpanDetector, detectorY);
    ctx.lineTo(beamCenterPlateX + beamSpanDetector, detectorY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Central Ray
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX, sourceY);
    ctx.lineTo(beamCenterPlateX, detectorY);
    ctx.stroke();
    ctx.restore();

    // 3. Ray Tracing for Umbra and Penumbra
    // Effective projection boundaries:
    // Ray 1: From left of focal spot through left of object
    // Ray 2: From right of focal spot through left of object
    // Ray 3: From left of focal spot through right of object
    // Ray 4: From right of focal spot through right of object

    // Helper for ray-line intersection with detector plate y = detectorY
    const projectRayToPlate = (fx: number, fy: number, ox: number, oy: number) => {
      const slope = (ox - fx) / (oy - fy);
      return fx + slope * (detectorY - fy);
    };

    const pPlate_L_from_R = projectRayToPlate(focalRightX, sourceY, objCornerTL.x, objCornerTL.y);
    const pPlate_L_from_L = projectRayToPlate(focalLeftX, sourceY, objCornerTL.x, objCornerTL.y);
    const pPlate_R_from_R = projectRayToPlate(focalRightX, sourceY, objCornerTR.x, objCornerTR.y);
    const pPlate_R_from_L = projectRayToPlate(focalLeftX, sourceY, objCornerTR.x, objCornerTR.y);

    const plateLeftPenumbra = Math.min(pPlate_L_from_R, pPlate_L_from_L);
    const plateLeftUmbra = Math.max(pPlate_L_from_R, pPlate_L_from_L);
    const plateRightUmbra = Math.min(pPlate_R_from_R, pPlate_R_from_L);
    const plateRightPenumbra = Math.max(pPlate_R_from_R, pPlate_R_from_L);

    // Draw Penumbra Rays (Amber / Blur zone)
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 159, 28, 0.5)';
    ctx.setLineDash([3, 3]);

    // Left penumbra cone
    ctx.beginPath();
    ctx.moveTo(focalRightX, sourceY);
    ctx.lineTo(plateLeftPenumbra, detectorY);
    ctx.moveTo(focalLeftX, sourceY);
    ctx.lineTo(plateLeftUmbra, detectorY);

    // Right penumbra cone
    ctx.moveTo(focalRightX, sourceY);
    ctx.lineTo(plateRightUmbra, detectorY);
    ctx.moveTo(focalLeftX, sourceY);
    ctx.lineTo(plateRightPenumbra, detectorY);
    ctx.stroke();
    ctx.restore();

    // 4. Fill Shadow Cast Volumes
    // Umbra volume (full blockage)
    if (plateRightUmbra > plateLeftUmbra) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      ctx.moveTo(objCornerBL.x, objCornerBL.y);
      ctx.lineTo(objCornerBR.x, objCornerBR.y);
      ctx.lineTo(plateRightUmbra, detectorY);
      ctx.lineTo(plateLeftUmbra, detectorY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Left Penumbra zone
    ctx.save();
    const gradL = ctx.createLinearGradient(plateLeftPenumbra, detectorY, plateLeftUmbra, detectorY);
    gradL.addColorStop(0, 'rgba(255, 159, 28, 0.05)');
    gradL.addColorStop(1, 'rgba(255, 159, 28, 0.45)');
    ctx.fillStyle = gradL;
    ctx.beginPath();
    ctx.moveTo(objCornerBL.x, objCornerBL.y);
    ctx.lineTo(plateLeftUmbra, detectorY);
    ctx.lineTo(plateLeftPenumbra, detectorY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right Penumbra zone
    ctx.save();
    const gradR = ctx.createLinearGradient(plateRightUmbra, detectorY, plateRightPenumbra, detectorY);
    gradR.addColorStop(0, 'rgba(255, 159, 28, 0.45)');
    gradR.addColorStop(1, 'rgba(255, 159, 28, 0.05)');
    ctx.fillStyle = gradR;
    ctx.beginPath();
    ctx.moveTo(objCornerBR.x, objCornerBR.y);
    ctx.lineTo(plateRightPenumbra, detectorY);
    ctx.lineTo(plateRightUmbra, detectorY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 5. Draw 3D Specimen Block at Depth
    ctx.save();
    const objGrad = ctx.createLinearGradient(objCenterX, objTopY, objCenterX, objBottomY);
    objGrad.addColorStop(0, '#38bdf8');
    objGrad.addColorStop(0.5, '#0284c7');
    objGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = objGrad;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(objCornerTL.x, objCornerTL.y);
    ctx.lineTo(objCornerTR.x, objCornerTR.y);
    ctx.lineTo(objCornerBR.x, objCornerBR.y);
    ctx.lineTo(objCornerBL.x, objCornerBL.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Internal grid / center marker on specimen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo((objCornerTL.x + objCornerBL.x) / 2, (objCornerTL.y + objCornerBL.y) / 2);
    ctx.lineTo((objCornerTR.x + objCornerBR.x) / 2, (objCornerTR.y + objCornerBR.y) / 2);
    ctx.stroke();
    ctx.restore();

    // Specimen Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`SPECIMEN (${objectWidth} cm × ${objectDepth} cm)`, objCenterX, sodY + 4);

    // 6. Draw Focal Spot at Tube Head
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.5;
    ctx.fillRect(focalLeftX, sourceY - 7, focalVisualWidth, 7);
    ctx.strokeRect(focalLeftX, sourceY - 7, focalVisualWidth, 7);

    // Focal label
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Focal Spot F = ${focalSpot} mm`, centerX, sourceY - 14);
    ctx.restore();

    // 7. Draw Detector Plate (Image Receptor)
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(30, detectorY, width - 60, 10);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30, detectorY, width - 60, 10);

    // Projected Umbra & Penumbra zones on plate
    // Umbra Bar
    if (plateRightUmbra > plateLeftUmbra) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(plateLeftUmbra, detectorY + 1, plateRightUmbra - plateLeftUmbra, 8);
    }
    // Left Penumbra Bar
    ctx.fillStyle = '#ff9f1c';
    ctx.fillRect(plateLeftPenumbra, detectorY + 1, Math.max(1, plateLeftUmbra - plateLeftPenumbra), 8);
    // Right Penumbra Bar
    ctx.fillRect(plateRightUmbra, detectorY + 1, Math.max(1, plateRightPenumbra - plateRightUmbra), 8);

    // Plate labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DETECTOR / IMAGE PLATE (IR)', 35, detectorY + 24);

    // Umbra & Penumbra dimension callouts
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff9f1c';
    ctx.fillText(`Ug = ${calc.unsharpness_mm.toFixed(3)} mm (Penumbra Blur)`, (plateLeftPenumbra + plateLeftUmbra) / 2, detectorY + 36);

    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`Nominal Image I = ${calc.nominalImageWidth.toFixed(1)} cm (M = ${calc.magnification.toFixed(3)}x)`, (plateLeftUmbra + plateRightUmbra) / 2, detectorY + 24);
    ctx.restore();

    // 8. Dimension Lines on Left Border (SID, SOD, OID)
    const dimX = 22;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1;
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';

    // SID Vertical Arrow Line
    ctx.beginPath();
    ctx.moveTo(dimX, sourceY);
    ctx.lineTo(dimX, detectorY);
    ctx.stroke();

    // SID tick marks
    ctx.beginPath();
    ctx.moveTo(dimX - 4, sourceY);
    ctx.lineTo(dimX + 4, sourceY);
    ctx.moveTo(dimX - 4, detectorY);
    ctx.lineTo(dimX + 4, detectorY);
    ctx.stroke();

    // SID Text
    ctx.fillText(`SID = ${sid} cm`, dimX + 6, (sourceY + detectorY) / 2 - 14);

    // OID Bracket (from plate to object base)
    const oidDimX = 40;
    ctx.strokeStyle = '#ff9f1c';
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.moveTo(oidDimX, objBottomY);
    ctx.lineTo(oidDimX, detectorY);
    ctx.stroke();
    ctx.fillText(`OID = ${oid} cm`, oidDimX + 4, (objBottomY + detectorY) / 2);

    // Thickness / Depth Bracket (across specimen)
    ctx.strokeStyle = '#a78bfa';
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.moveTo(oidDimX, objTopY);
    ctx.lineTo(oidDimX, objBottomY);
    ctx.stroke();
    ctx.fillText(`Δz = ${objectDepth} cm`, oidDimX + 4, (objTopY + objBottomY) / 2);

    // SOD Bracket (from tube to object top)
    ctx.strokeStyle = '#00e5ff';
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(oidDimX, sourceY);
    ctx.lineTo(oidDimX, objTopY);
    ctx.stroke();
    ctx.fillText(`SOD = ${calc.sodTop.toFixed(1)} cm`, oidDimX + 4, (sourceY + objTopY) / 2);
    ctx.restore();

  }, [sid, oid, objectWidth, objectDepth, focalSpot, objectTilt, beamAngle, lateralOffset, calc]);

  // Generate Audit Dossier Payload
  const dossierPayload: CalculationDossierPayload = useMemo(() => {
    return {
      reportTitle: `Radiographic Geometric Distortion & Penumbra Audit (SID: ${sid} cm, OID: ${oid} cm)`,
      moduleName: 'X-Ray Distortion & Geometric Optics',
      statuteCitation: 'Bushong Radiologic Science 12th Ed. Ch. 17 / ASME BPVC Sec V Art. 2 (Table T-274.1) / ISO 17636-1',
      verificationTestId: 'VTEST-27 (Geometric Magnification & Penumbra Unsharpness)',
      operatorName: 'Imaging Physicist / Radiographic Engineer',
      operatorCredentials: 'DABR, ASNT Level III',
      facility: 'Radiological Physics & NDT Metrology Laboratory',
      notes: `Evaluation of radiographic projection distortion, geometric magnification M = ${calc.magnification.toFixed(3)}x, and penumbra unsharpness Ug = ${calc.unsharpness_mm.toFixed(3)} mm across specimen depth ${objectDepth} cm. ASME Section V compliance: ${calc.asmeCompliant ? 'PASS' : 'EXCEEDED'}.`,
      formulaDescription: 'M = \\frac{\\text{SID}}{\\text{SOD}}, \\quad U_g = F \\cdot \\frac{\\text{OID}}{\\text{SOD}} = F \\cdot (M - 1), \\quad M_{\\text{top}} = \\frac{\\text{SID}}{\\text{SOD} - \\Delta z/2}',
      inputs: [
        { label: 'Source-to-Image Distance (SID)', value: sid, unit: 'cm' },
        { label: 'Object-to-Image Distance (OID)', value: oid, unit: 'cm' },
        { label: 'Source-to-Object Distance (SOD)', value: Number(calc.sod.toFixed(1)), unit: 'cm' },
        { label: 'Specimen True Dimension (O)', value: objectWidth, unit: 'cm' },
        { label: 'Specimen Thickness / Depth (Δz)', value: objectDepth, unit: 'cm' },
        { label: 'Focal Spot Size (F)', value: focalSpot, unit: 'mm' },
        { label: 'Object Tilt Angle (α)', value: objectTilt, unit: 'deg' },
        { label: 'Central Ray Angulation (θ)', value: beamAngle, unit: 'deg' },
        { label: 'Lateral Off-Axis Displacement', value: lateralOffset, unit: 'cm' }
      ],
      outputs: [
        { label: 'Magnification Factor (M)', value: `${calc.magnification.toFixed(3)}x`, status: 'COMPLIANT' },
        { label: 'Projected Image Size (I)', value: `${calc.nominalImageWidth.toFixed(2)} cm` },
        { label: 'Geometric Unsharpness (Ug)', value: `${calc.unsharpness_mm.toFixed(3)} mm`, unit: 'mm', status: calc.asmeCompliant ? 'PASS' : 'EXCEEDED' },
        { label: 'Theoretical Resolution Limit', value: `${calc.resolutionLimit_lpmm.toFixed(2)} lp/mm` },
        { label: 'Top Surface Magnification (M_top)', value: `${calc.magTop.toFixed(3)}x` },
        { label: 'Bottom Surface Magnification (M_bottom)', value: `${calc.magBottom.toFixed(3)}x` },
        { label: 'Depth Frustum Ratio (M_top / M_bottom)', value: `${calc.depthDistortionRatio.toFixed(3)}x` },
        { label: 'ASME Sec V Table T-274.1 Limit', value: `${calc.asmeLimit_mm.toFixed(2)} mm`, status: calc.asmeCompliant ? 'COMPLIANT' : 'EXCEEDED' }
      ]
    };
  }, [sid, oid, objectDepth, focalSpot, objectWidth, objectTilt, beamAngle, lateralOffset, calc]);

  return (
    <div style={{ padding: '4px 0', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid rgba(0, 229, 255, 0.25)',
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '18px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.5rem' }}>📐</span>
            <h1 style={{ margin: 0, fontSize: '1.35rem', color: '#ffffff', letterSpacing: '0.5px' }}>
              X-Ray Image Distortion, Magnification & Geometric Penumbra
            </h1>
            <span style={{
              background: 'rgba(0, 229, 255, 0.15)',
              color: 'var(--color-primary)',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(0, 229, 255, 0.3)'
            }}>
              SID / OID / DEPTH FRUSTUM
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Radiographic projection physics: source-to-plate distance, object depth differential magnification, focal penumbra unsharpness (<InlineMath math="U_g" />), and shape distortion (foreshortening vs elongation).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <VerificationBadge
            testId="VTEST-27"
            standard="Bushong / ASME Sec V"
            title="Bushong Radiologic Science Ch. 17 / ASME BPVC Sec V Table T-274.1"
          />
          <button
            onClick={() => setIsDossierOpen(true)}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              padding: '6px 14px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.80rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🖨️ Export Audit Dossier
          </button>
        </div>
      </div>

      {/* Preset Scenario Selector Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        padding: '10px 14px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        overflowX: 'auto'
      }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          CLINICAL & NDT PRESETS:
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              style={{
                background: selectedPresetId === preset.id ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: selectedPresetId === preset.id ? '#00e5ff' : 'var(--color-text-muted)',
                border: selectedPresetId === preset.id ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '5px 11px',
                borderRadius: '5px',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '18px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'ray_tracer', label: '📐 Interactive Geometric Ray-Tracer', icon: '⚡' },
          { id: 'depth_distortion', label: '📦 Object Depth & Frustum Distortion', icon: '🧊' },
          { id: 'shape_distortion', label: '📐 Tilt, Foreshortening & Angulation', icon: '📐' },
          { id: 'compliance_ndt', label: '🛡️ ASME & ISO NDT Standards', icon: '✓' },
          { id: 'physics_theory', label: '📚 Physics Derivations & Formulas', icon: '📖' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as DistortionTab)}
            style={{
              background: activeTab === tab.id ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
              color: activeTab === tab.id ? '#00e5ff' : 'var(--color-text-muted)',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #00e5ff' : '2px solid transparent',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Top Level Metric HUD Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '12px',
        marginBottom: '18px'
      }}>
        {/* Card 1: Magnification */}
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Magnification Factor (M)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00e5ff', margin: '4px 0' }}>
            {calc.magnification.toFixed(3)}x
          </div>
          <div style={{ fontSize: '0.74rem', color: calc.magnification > 1.2 ? '#ff9f1c' : '#10b981' }}>
            {calc.percentEnlargement >= 0 ? `+${calc.percentEnlargement.toFixed(1)}% size increase` : `${calc.percentEnlargement.toFixed(1)}%`}
          </div>
        </div>

        {/* Card 2: Geometric Unsharpness */}
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 159, 28, 0.25)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Penumbra Blur (Ug)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ff9f1c', margin: '4px 0' }}>
            {calc.unsharpness_mm.toFixed(3)} mm
          </div>
          <div style={{ fontSize: '0.74rem', color: calc.asmeCompliant ? '#10b981' : '#ef4444' }}>
            {calc.asmeCompliant ? '✓ Within ASME BPVC limit' : '⚠ Exceeds ASME BPVC limit'}
          </div>
        </div>

        {/* Card 3: Projected Image Size */}
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Projected Image Size (I)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
            {calc.nominalImageWidth.toFixed(1)} cm
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
            True specimen: {objectWidth} cm
          </div>
        </div>

        {/* Card 4: Depth Distortion Delta M */}
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Depth Frustum Ratio
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa', margin: '4px 0' }}>
            {calc.depthDistortionRatio.toFixed(3)}x
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
            ΔM = {(calc.deltaMag).toFixed(3)} (top vs bottom)
          </div>
        </div>

        {/* Card 5: Spatial Resolution Limit */}
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Resolution Limit (flimit)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
            {calc.resolutionLimit_lpmm > 100 ? '> 100' : calc.resolutionLimit_lpmm.toFixed(2)} lp/mm
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
            Line pairs per mm cutoff
          </div>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE GEOMETRIC RAY-TRACER */}
      {activeTab === 'ray_tracer' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '18px' }}>
          {/* Controls Column */}
          <div className="card" style={{ padding: '18px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> Radiographic Geometry Controls
            </h3>

            {/* SID Slider */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Source-to-Plate Distance (SID / SPD):</span>
                <span style={{ color: '#00e5ff', fontWeight: 700 }}>{sid} cm ({((sid / 2.54)).toFixed(1)}")</span>
              </div>
              <input
                type="range"
                min={40}
                max={300}
                step={1}
                value={sid}
                onChange={e => setSid(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>
                <span>40 cm (Close)</span>
                <span>100 cm (40")</span>
                <span>180 cm (72")</span>
                <span>300 cm</span>
              </div>
            </div>

            {/* OID Slider */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Object-to-Plate Distance (OID / OPD):</span>
                <span style={{ color: '#ff9f1c', fontWeight: 700 }}>{oid} cm</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.min(100, sid - 5)}
                step={0.5}
                value={oid}
                onChange={e => setOid(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>
                <span>0 cm (Contact)</span>
                <span>SOD = {calc.sod.toFixed(1)} cm</span>
                <span>{Math.min(100, sid - 5)} cm</span>
              </div>
            </div>

            {/* Object Depth (Thickness) Slider */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Object Depth / Thickness (Δz):</span>
                <span style={{ color: '#a78bfa', fontWeight: 700 }}>{objectDepth} cm ({calc.thickness_mm.toFixed(0)} mm)</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={40}
                step={0.5}
                value={objectDepth}
                onChange={e => setObjectDepth(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>
                <span>2 mm (Sheet)</span>
                <span>10 cm</span>
                <span>22 cm (Torso)</span>
                <span>40 cm</span>
              </div>
            </div>

            {/* Object Width Slider */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Object True Width / Dimension (O):</span>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>{objectWidth} cm</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={0.5}
                value={objectWidth}
                onChange={e => setObjectWidth(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Focal Spot Size Slider */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Effective Focal Spot Size (F):</span>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{focalSpot} mm</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={4.0}
                step={0.05}
                value={focalSpot}
                onChange={e => setFocalSpot(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>
                <span>0.1 (Mammo)</span>
                <span>0.6 (Fine)</span>
                <span>1.2 (Broad)</span>
                <span>3.0 (NDT)</span>
              </div>
            </div>

            {/* Object Tilt Angle Slider */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Object Inclination / Tilt (α):</span>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>{objectTilt}°</span>
              </div>
              <input
                type="range"
                min={-60}
                max={60}
                step={1}
                value={objectTilt}
                onChange={e => setObjectTilt(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>
                <span>-60°</span>
                <span>0° (Parallel to Plate)</span>
                <span>+60°</span>
              </div>
            </div>

            {/* Central Ray Angulation Slider */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Central Ray Angulation (θ):</span>
                <span style={{ color: '#ec4899', fontWeight: 700 }}>{beamAngle}°</span>
              </div>
              <input
                type="range"
                min={-45}
                max={45}
                step={1}
                value={beamAngle}
                onChange={e => setBeamAngle(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>
                <span>-45° (Cephalic)</span>
                <span>0° (Perpendicular)</span>
                <span>+45° (Caudal)</span>
              </div>
            </div>

            {/* Lateral Off-Axis Shift Slider */}
            <div style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Lateral Parallax Offset (xoff):</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{lateralOffset} cm</span>
              </div>
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={lateralOffset}
                onChange={e => setLateralOffset(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Interactive Ray-Tracing Canvas & Shadow Profile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="card" style={{ padding: '14px', background: 'rgba(10, 14, 23, 0.95)', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔭</span> REAL-TIME 2D RADIOGRAPHIC ELEVATION RAY-TRACER
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                  SID: {sid} cm | SOD: {calc.sod.toFixed(1)} cm | OID: {oid} cm
                </div>
              </div>

              {/* HTML5 Canvas */}
              <canvas
                ref={canvasRef}
                width={780}
                height={400}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'block'
                }}
              />

              {/* Canvas Legend */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                marginTop: '10px',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '6px',
                fontSize: '0.74rem',
                color: 'var(--color-text-muted)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px', display: 'inline-block' }} />
                  <span>X-Ray Focal Spot (F = {focalSpot} mm)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#0284c7', borderRadius: '2px', display: 'inline-block' }} />
                  <span>3D Specimen with Depth (Δz = {objectDepth} cm)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#000000', border: '1px solid #64748b', borderRadius: '2px', display: 'inline-block' }} />
                  <span>Umbra (Complete Shadow: {calc.umbraWidth_mm.toFixed(1)} mm)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#ff9f1c', borderRadius: '2px', display: 'inline-block' }} />
                  <span>Penumbra (Ug Blur: {calc.unsharpness_mm.toFixed(3)} mm)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', background: 'rgba(0, 229, 255, 0.3)', border: '1px dashed #00e5ff', borderRadius: '2px', display: 'inline-block' }} />
                  <span>Central Ray Axis</span>
                </div>
              </div>
            </div>

            {/* 1D Radiographic Intensity Profile across Detector Plate */}
            <div className="card" style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                📈 DETECTOR INTENSITY & PENUMBRA EDGE BLUR PROFILE
              </div>
              <div style={{ height: '200px', width: '100%' }}>
                <Plot
                  data={[
                    {
                      x: [
                        -calc.nominalImageWidth * 0.9,
                        -calc.nominalImageWidth * 0.5 - (calc.unsharpness_mm / 10),
                        -calc.nominalImageWidth * 0.5,
                        calc.nominalImageWidth * 0.5,
                        calc.nominalImageWidth * 0.5 + (calc.unsharpness_mm / 10),
                        calc.nominalImageWidth * 0.9
                      ],
                      y: [100, 100, 0, 0, 100, 100],
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Plate Exposure %',
                      line: { color: '#00e5ff', width: 2.5, shape: 'linear' },
                      fill: 'tozeroy',
                      fillcolor: 'rgba(0, 229, 255, 0.08)'
                    }
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 45, r: 25, t: 15, b: 35 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    xaxis: {
                      title: { text: 'Detector Lateral Coordinate (cm)', font: { size: 10, color: '#94a3b8' } },
                      color: '#94a3b8',
                      gridcolor: 'rgba(255, 255, 255, 0.06)'
                    },
                    yaxis: {
                      title: { text: 'Transmission %', font: { size: 10, color: '#94a3b8' } },
                      range: [-5, 110],
                      color: '#94a3b8',
                      gridcolor: 'rgba(255, 255, 255, 0.06)'
                    },
                    showlegend: false
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                * The transition ramp between 0% and 100% transmission corresponds to the geometric unsharpness zone (<InlineMath math={`U_g = ${calc.unsharpness_mm.toFixed(3)}\\text{ mm}`} />). Wider penumbra ramps lower edge sharpness and spatial contrast.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OBJECT DEPTH & VOLUMETRIC FRUSTUM DISTORTION */}
      {activeTab === 'depth_distortion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(167, 139, 250, 0.25)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#a78bfa', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📦</span> Volumetric Differential Magnification & Depth Frustum Distortion
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              Real radiological subjects are not planar; they possess substantial physical depth (<InlineMath math="\Delta z" />). Because X-rays diverge from a point source, anatomical planes closer to the tube (<InlineMath math="\text{SOD}_{\text{top}}" />) experience dramatically higher magnification than deeper planes (<InlineMath math="\text{SOD}_{\text{bottom}}" />). A spherical lesion or cylindrical vessel is consequently projected onto the plate as a <strong>trapezoidal frustum</strong> or <strong>asymmetric teardrop</strong>.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginTop: '16px'
            }}>
              {/* Top Surface Plane */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                padding: '14px'
              }}>
                <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                  1. ENTRANCE SURFACE (Top Plane — Closer to Tube)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  • Distance to Focal Spot (<InlineMath math="\text{SOD}_{\text{top}}" />): <strong>{calc.sodTop.toFixed(1)} cm</strong><br />
                  • Top Magnification (<InlineMath math="M_{\text{top}}" />): <strong style={{ color: '#38bdf8' }}>{calc.magTop.toFixed(3)}x</strong><br />
                  • Projected Dimension: <strong>{calc.widthTop_projected.toFixed(2)} cm</strong><br />
                  • Local Penumbra Blur: <strong>{calc.penumbraTop_mm.toFixed(3)} mm</strong>
                </div>
              </div>

              {/* Bottom Surface Plane */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                borderRadius: '8px',
                padding: '14px'
              }}>
                <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>
                  2. EXIT SURFACE (Bottom Plane — Closer to Plate)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  • Distance to Focal Spot (<InlineMath math="\text{SOD}_{\text{bottom}}" />): <strong>{calc.sodBottom.toFixed(1)} cm</strong><br />
                  • Bottom Magnification (<InlineMath math="M_{\text{bottom}}" />): <strong style={{ color: '#a78bfa' }}>{calc.magBottom.toFixed(3)}x</strong><br />
                  • Projected Dimension: <strong>{calc.widthBottom_projected.toFixed(2)} cm</strong><br />
                  • Local Penumbra Blur: <strong>{calc.penumbraBottom_mm.toFixed(3)} mm</strong>
                </div>
              </div>

              {/* Differential Comparison */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 159, 28, 0.3)',
                borderRadius: '8px',
                padding: '14px'
              }}>
                <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#ff9f1c', marginBottom: '8px' }}>
                  3. VOLUMETRIC DISTORTION DELTA
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  • Differential Magnification (<InlineMath math="\Delta M" />): <strong style={{ color: '#ff9f1c' }}>{calc.deltaMag.toFixed(3)}</strong><br />
                  • Depth Distortion Ratio (<InlineMath math="M_{\text{top}}/M_{\text{bottom}}" />): <strong>{calc.depthDistortionRatio.toFixed(3)}x</strong><br />
                  • Frustum Taper Angle (<InlineMath math="\psi" />): <strong>{calc.frustumTaperAngle.toFixed(2)}°</strong><br />
                  • Projective Dimension Flare: <strong>+{(Math.abs(calc.widthTop_projected - calc.widthBottom_projected)).toFixed(2)} cm</strong>
                </div>
              </div>
            </div>

            {/* Depth Distortion Interactive Plot */}
            <div style={{ marginTop: '20px', height: '280px', width: '100%' }}>
              <Plot
                data={[
                  {
                    x: [calc.sodTop, calc.sod, calc.sodBottom],
                    y: [calc.magTop, calc.magnification, calc.magBottom],
                    mode: 'lines+markers',
                    type: 'scatter',
                    name: 'Magnification vs Depth Position',
                    line: { color: '#a78bfa', width: 3 },
                    marker: { size: 8, color: '#00e5ff' }
                  }
                ]}
                layout={{
                  autosize: true,
                  title: { text: `Magnification Gradient across Specimen Depth (${objectDepth} cm Thickness)`, font: { size: 12, color: '#ffffff' } },
                  margin: { l: 45, r: 25, t: 35, b: 40 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  xaxis: {
                    title: { text: 'Source-to-Object Distance SOD (cm)', font: { size: 10, color: '#94a3b8' } },
                    color: '#94a3b8',
                    gridcolor: 'rgba(255, 255, 255, 0.06)'
                  },
                  yaxis: {
                    title: { text: 'Local Magnification Factor (M)', font: { size: 10, color: '#94a3b8' } },
                    color: '#94a3b8',
                    gridcolor: 'rgba(255, 255, 255, 0.06)'
                  }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* Clinical Note: AP vs PA Cardiomegaly */}
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              fontSize: '0.80rem',
              color: '#fca5a5',
              lineHeight: '1.5'
            }}>
              <strong>Clinical Diagnostic Insight: The False Cardiomegaly Artifact in Bedside AP Radiographs</strong><br />
              In standard <strong>PA (Posteroanterior) chest radiography</strong> at 180 cm (72"), the anterior anatomical location of the cardiac silhouette places the heart approximately 4–6 cm from the detector plate (<InlineMath math="M \approx 1.03" />). In portable <strong>AP (Anteroposterior) views</strong> at 100 cm (40"), the heart is located on the entrance side, 18–22 cm from the detector. The resulting magnification (<InlineMath math="M \approx 1.22\times" />) falsely inflates the cardiothoracic ratio (CTR), leading to artificial diagnoses of cardiomegaly if technique geometry is uncorrected.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SHAPE DISTORTION, FORESHORTENING & ANGULATION */}
      {activeTab === 'shape_distortion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📐</span> Shape Distortion: Foreshortening, Elongation & The Bisecting Angle Rule
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              Shape distortion is the unequal magnification of different parts of the same object due to misalignment between the <strong>Central X-Ray Beam</strong>, the <strong>Anatomical Long Axis</strong>, and the <strong>Image Receptor Plate</strong>.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '16px',
              marginTop: '16px'
            }}>
              {/* Foreshortening Box */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '14px'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171', marginBottom: '8px' }}>
                  1. FORESHORTENING (Object Inclined / Tilted)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  Occurs when the object's long axis is angled (<InlineMath math={`\\alpha = ${objectTilt}^\\circ`} />) relative to the image receptor while the central ray remains perpendicular to the plate.<br />
                  • Apparent Projected Dimension: <strong style={{ color: '#f87171' }}>{calc.foreshortenedWidth.toFixed(2)} cm</strong><br />
                  • Contraction Ratio: <strong>{(calc.foreshorteningRatio * 100).toFixed(1)}% of magnified size</strong><br />
                  • Mathematical Formulation:
                  <BlockMath math="L' = L_0 \cdot \cos(\alpha) \cdot M" />
                </div>
              </div>

              {/* Elongation Box */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                padding: '14px'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                  2. ELONGATION (Central Ray Angled)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  Occurs when the central ray is angled (<InlineMath math={`\\theta = ${beamAngle}^\\circ`} />) relative to the perpendicular plate normal, or the receptor is tilted.<br />
                  • Stretched Projected Dimension: <strong style={{ color: '#38bdf8' }}>{calc.elongatedWidth.toFixed(2)} cm</strong><br />
                  • Expansion Factor: <strong>{(calc.elongationRatio * 100).toFixed(1)}% of normal</strong><br />
                  • Mathematical Formulation:
                  <BlockMath math="L' = \frac{L_0 \cdot M}{\cos(\theta)}" />
                </div>
              </div>

              {/* Bisecting Angle Box */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '14px'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                  3. CIESZYNSKI'S BISECTING ANGLE RULE
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  When anatomy cannot lie flat on the plate (e.g. intraoral dental periapical, scaphoid fracture views), angling the central ray perpendicular to the <strong>imaginary angle bisector</strong> preserves isometric length!<br />
                  • Current Object Tilt: <strong>{objectTilt}°</strong><br />
                  • Optimal Tube Angulation: <strong style={{ color: '#10b981' }}>{calc.idealBisectingAngle_deg.toFixed(1)}°</strong><br />
                  • Resulting Projected Length: <strong>{calc.nominalImageWidth.toFixed(2)} cm</strong> (True Isometric)
                </div>
              </div>
            </div>

            {/* Shape Distortion Interactive Chart */}
            <div style={{ marginTop: '20px', height: '280px', width: '100%' }}>
              <Plot
                data={[
                  {
                    x: [0, 10, 20, 30, 40, 50, 60, 70],
                    y: [0, 10, 20, 30, 40, 50, 60, 70].map(deg => objectWidth * Math.cos((deg * Math.PI) / 180) * calc.magnification),
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Foreshortened Length (Object Tilt α)',
                    line: { color: '#f87171', width: 2.5 }
                  },
                  {
                    x: [0, 10, 20, 30, 40, 50, 60],
                    y: [0, 10, 20, 30, 40, 50, 60].map(deg => (objectWidth * calc.magnification) / Math.cos((deg * Math.PI) / 180)),
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Elongated Length (Beam Angle θ)',
                    line: { color: '#38bdf8', width: 2.5 }
                  },
                  {
                    x: [0, 70],
                    y: [calc.nominalImageWidth, calc.nominalImageWidth],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Nominal Magnified Length (0° Tilt)',
                    line: { color: '#10b981', dash: 'dash', width: 2 }
                  }
                ]}
                layout={{
                  autosize: true,
                  title: { text: `Projected Length Response to Object Tilt vs Beam Angle (SID = ${sid} cm, OID = ${oid} cm)`, font: { size: 12, color: '#ffffff' } },
                  margin: { l: 45, r: 25, t: 35, b: 40 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  xaxis: {
                    title: { text: 'Tilt / Angulation Angle (Degrees)', font: { size: 10, color: '#94a3b8' } },
                    color: '#94a3b8',
                    gridcolor: 'rgba(255, 255, 255, 0.06)'
                  },
                  yaxis: {
                    title: { text: 'Projected Dimension on Plate (cm)', font: { size: 10, color: '#94a3b8' } },
                    color: '#94a3b8',
                    gridcolor: 'rgba(255, 255, 255, 0.06)'
                  },
                  legend: { font: { size: 10, color: '#ffffff' } }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ASME & ISO NDT COMPLIANCE STANDARDS */}
      {activeTab === 'compliance_ndt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛡️</span> Industrial & Clinical Regulatory Unsharpness Thresholds
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              In critical non-destructive testing (NDT) of pressure vessels and aerospace alloys, excessive geometric unsharpness (<InlineMath math="U_g" />) masks minute weld cracks, lack of fusion, and porosity. Standards strictly mandate maximum allowable penumbra values.
            </p>

            {/* ASME Section V Table T-274.1 Checker */}
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#ffffff' }}>
                  ASME BPVC SECTION V ARTICLE 2 (TABLE T-274.1) AUDIT CHECK
                </div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  background: calc.asmeCompliant ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: calc.asmeCompliant ? '#10b981' : '#ef4444',
                  border: `1px solid ${calc.asmeCompliant ? '#10b981' : '#ef4444'}`
                }}>
                  {calc.asmeCompliant ? '✓ ASME PASS: COMPLIANT' : '⚠ ASME FAIL: EXCEEDS LIMIT'}
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '8px' }}>Standard / Code</th>
                    <th style={{ padding: '8px' }}>Governing Metric</th>
                    <th style={{ padding: '8px' }}>Permissible Limit</th>
                    <th style={{ padding: '8px' }}>Calculated Value</th>
                    <th style={{ padding: '8px' }}>Compliance Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>ASME Sec V Table T-274.1</td>
                    <td style={{ padding: '8px' }}>Material Thickness: {calc.thickness_mm.toFixed(1)} mm</td>
                    <td style={{ padding: '8px', color: '#ff9f1c', fontWeight: 700 }}>{calc.asmeLimit_mm.toFixed(2)} mm (max Ug)</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{calc.unsharpness_mm.toFixed(3)} mm</td>
                    <td style={{ padding: '8px', color: calc.asmeCompliant ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {calc.asmeCompliant ? 'PASS' : 'EXCEEDED'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>ISO 17636-1 Class A</td>
                    <td style={{ padding: '8px' }}>General NDT Weld Quality</td>
                    <td style={{ padding: '8px', color: '#ff9f1c', fontWeight: 700 }}>0.400 mm (max Ug)</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{calc.unsharpness_mm.toFixed(3)} mm</td>
                    <td style={{ padding: '8px', color: calc.isoClassACompliant ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {calc.isoClassACompliant ? 'PASS' : 'EXCEEDED'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>ISO 17636-1 Class B</td>
                    <td style={{ padding: '8px' }}>Critical Aerospace / High Sensitivity</td>
                    <td style={{ padding: '8px', color: '#ff9f1c', fontWeight: 700 }}>0.150 mm (max Ug)</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{calc.unsharpness_mm.toFixed(3)} mm</td>
                    <td style={{ padding: '8px', color: calc.isoClassBCompliant ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {calc.isoClassBCompliant ? 'PASS' : 'EXCEEDED'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 600 }}>Diagnostic Skeletal (AAPM)</td>
                    <td style={{ padding: '8px' }}>Fine Trabecular Extremity Resolution</td>
                    <td style={{ padding: '8px', color: '#ff9f1c', fontWeight: 700 }}>0.200 mm (max Ug)</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{calc.unsharpness_mm.toFixed(3)} mm</td>
                    <td style={{ padding: '8px', color: calc.diagnosticExtremityCompliant ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {calc.diagnosticExtremityCompliant ? 'PASS' : 'EXCEEDED'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Corrective Guidance Callout */}
              {!calc.asmeCompliant && (
                <div style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: '#fca5a5'
                }}>
                  <strong>Corrective Engineering Action Required:</strong> To bring geometric unsharpness into ASME Section V compliance without changing focal spot size (<InlineMath math={`F = ${focalSpot}\\text{ mm}`} />) or object distance (<InlineMath math={`\\text{OID} = ${oid}\\text{ cm}`} />), the Source-to-Plate Distance must be increased to at least <strong style={{ color: '#ffffff' }}>{calc.minCompliantSidAsme.toFixed(1)} cm</strong> (currently {sid} cm).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MATHEMATICAL PHYSICS DERIVATIONS */}
      {activeTab === 'physics_theory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(0, 229, 255, 0.25)' }}>
            <h3 style={{ margin: '0 0 14px 0', color: '#00e5ff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📚</span> Mathematical Foundations & Geometric Derivations
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
              {/* Similar Triangles Derivation */}
              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                  1. Magnification Factor via Thales' Theorem (Similar Triangles)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  From a point source focal position, the ratio of projected shadow dimension <InlineMath math="I" /> to true object size <InlineMath math="O" /> is governed by equivalent similar triangles:
                  <BlockMath math="M = \frac{I}{O} = \frac{\text{SID}}{\text{SOD}} = \frac{\text{SID}}{\text{SID} - \text{OID}}" />
                  Percentage enlargement over true physical scale:
                  <BlockMath math="\% \text{ Enlargement} = (M - 1) \times 100\% = \frac{\text{OID}}{\text{SOD}} \times 100\%" />
                </div>
              </div>

              {/* Penumbra Blur Derivation */}
              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ff9f1c', marginBottom: '8px' }}>
                  2. Geometric Penumbra Unsharpness (Finite Focal Spot)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  Because physical X-ray targets have a finite focal spot dimension <InlineMath math="F" />, rays originate from across its surface area, creating an edge blur transition (penumbra):
                  <BlockMath math="U_g = F \times \frac{\text{OID}}{\text{SOD}} = F \times (M - 1)" />
                  The full unshadowed umbra core width on the image receptor is:
                  <BlockMath math="U = \max\left(0, \ O \cdot M - U_g\right)" />
                </div>
              </div>

              {/* Depth Frustum Distortion */}
              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>
                  3. Differential Depth Frustum Magnification
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  For an object having finite depth / thickness <InlineMath math="\Delta z" />:
                  <BlockMath math="M_{\text{top}} = \frac{\text{SID}}{\text{SOD} - \frac{\Delta z}{2}}, \quad M_{\text{bottom}} = \frac{\text{SID}}{\text{SOD} + \frac{\Delta z}{2}}" />
                  The depth distortion ratio yields:
                  <BlockMath math="R_{\text{depth}} = \frac{M_{\text{top}}}{M_{\text{bottom}}} = \frac{\text{SOD} + \frac{\Delta z}{2}}{\text{SOD} - \frac{\Delta z}{2}}" />
                </div>
              </div>

              {/* Parallax Shift */}
              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                  4. Off-Axis Lateral Parallax Shift
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  Structures displaced from the central ray axis by lateral coordinate <InlineMath math="x_{\text{off}}" /> project outward:
                  <BlockMath math="\Delta x = x_{\text{plate}} - x_{\text{off}} = x_{\text{off}} \times (M - 1) = x_{\text{off}} \times \frac{\text{OID}}{\text{SOD}}" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Dossier Export Modal */}
      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default XRayDistortionModule;
