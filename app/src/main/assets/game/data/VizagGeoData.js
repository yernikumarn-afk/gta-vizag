// Authentic WGS84-Projected Geographic Coordinate System, Curated GIS Layers, Multi-Ridge Vizag DEM & Connected Road Network
// Reference Projection: Origin (0,0) = RK Beach (17.7142° N, 83.3236° E)
import {
  ORIGIN_LAT,
  ORIGIN_LNG,
  WORLD_BOUNDS,
  WORLD_SCALE,
  latLngToWorld,
  worldToLatLng
} from '../gis/GeoProjection.js';

export { ORIGIN_LAT, ORIGIN_LNG, WORLD_BOUNDS, WORLD_SCALE, latLngToWorld, worldToLatLng };

let activeGisManager = null;
export function setActiveGisManager(mgr) {
  activeGisManager = mgr;
}

// 16 Visakhapatnam Metropolitan Regions projected directly from authentic WGS84 lat/lng
const RAW_DISTRICTS = [
  {
    id: 'rk_beach',
    name: 'RK Beach',
    lat: 17.7142,
    lng: 83.3236,
    radius: 145,
    density: 'coastal',
    palette: ['#EAE0D2', '#D4E4F0', '#F3D4AD']
  },
  {
    id: 'beach_road',
    name: 'Beach Road',
    lat: 17.7235,
    lng: 83.3322,
    radius: 140,
    density: 'boulevard',
    palette: ['#DDE9F5', '#EFE5D8', '#C6DCEB']
  },
  {
    id: 'mvp_colony',
    name: 'MVP Colony',
    lat: 17.7415,
    lng: 83.3315,
    radius: 160,
    density: 'residential',
    palette: ['#F2DAC0', '#DDE8D6', '#EAE1D8']
  },
  {
    id: 'siripuram',
    name: 'Siripuram',
    lat: 17.7224,
    lng: 83.3150,
    radius: 150,
    density: 'highrise',
    palette: ['#9DC0E0', '#C4D3E3', '#E3EAF0']
  },
  {
    id: 'dwaraka_nagar',
    name: 'Dwaraka Nagar',
    lat: 17.7285,
    lng: 83.3015,
    radius: 160,
    density: 'commercial',
    palette: ['#E2CFC0', '#C2D1E0', '#ECD8C6']
  },
  {
    id: 'jagadamba',
    name: 'Jagadamba Junction',
    lat: 17.7122,
    lng: 83.3025,
    radius: 145,
    density: 'commercial',
    palette: ['#E8CFAF', '#D9B8A3', '#DCE4EC']
  },
  {
    id: 'nad_junction',
    name: 'NAD Junction',
    lat: 17.7445,
    lng: 83.2320,
    radius: 160,
    density: 'interchange',
    palette: ['#CFD8E2', '#E3C9A8', '#B7C8D8']
  },
  {
    id: 'gajuwaka',
    name: 'Gajuwaka',
    lat: 17.6868,
    lng: 83.2185,
    radius: 175,
    density: 'township',
    palette: ['#D9CFC2', '#C5D3DE', '#E4C7A7']
  },
  {
    id: 'kailasagiri',
    name: 'Kailasagiri',
    lat: 17.7492,
    lng: 83.3422,
    radius: 170,
    density: 'hilltop',
    palette: ['#EEF5FA', '#D6E8D8', '#F7EFE2']
  },
  {
    id: 'simhachalam',
    name: 'Simhachalam',
    lat: 17.7765,
    lng: 83.2495,
    radius: 185,
    density: 'temple_hill',
    palette: ['#E2B878', '#D69F59', '#EFE3CE']
  },
  {
    id: 'steel_plant',
    name: 'Steel Plant',
    lat: 17.6380,
    lng: 83.1680,
    radius: 205,
    density: 'industrial',
    palette: ['#8C96A2', '#A8B0B8', '#B86B48']
  },
  {
    id: 'vizag_port',
    name: 'Visakhapatnam Port',
    lat: 17.6945,
    lng: 83.2915,
    radius: 175,
    density: 'port',
    palette: ['#C85A48', '#4E78A0', '#D9A441']
  },
  {
    id: 'yarada_beach',
    name: 'Yarada Beach',
    lat: 17.6548,
    lng: 83.2712,
    radius: 170,
    density: 'coastal',
    palette: ['#F2DFC6', '#D5E8F0', '#E5C4A0']
  },
  {
    id: 'rushikonda',
    name: 'Rushikonda',
    lat: 17.7825,
    lng: 83.3852,
    radius: 170,
    density: 'coastal',
    palette: ['#DCEBF7', '#F2DFC4', '#CFE6D8']
  },
  {
    id: 'bheemili',
    name: 'Bheemili',
    lat: 17.8902,
    lng: 83.4520,
    radius: 180,
    density: 'coastal',
    palette: ['#F0DEC6', '#E6B89C', '#D8E5EE']
  },
  {
    id: 'madhurawada',
    name: 'Madhurawada',
    lat: 17.8055,
    lng: 83.3560,
    radius: 175,
    density: 'highrise',
    palette: ['#B5D0E8', '#DCE6F0', '#E8DACB']
  }
];

export const DISTRICTS = RAW_DISTRICTS.map((d) => {
  const w = latLngToWorld(d.lat, d.lng);
  return { ...d, x: w.x, z: w.z };
});

// Geographic Coastline Polyline (South -> North along Bay of Bengal, including Dolphin's Nose Peninsula & Yarada Cove)
export const COASTLINE_LATLNG = [
  [17.6100, 83.2220], // South Appikonda
  [17.6310, 83.2450], // Gangavaram Headland
  [17.6470, 83.2610], // Yarada South Cliffs
  [17.6552, 83.2738], // Yarada Beach Golden Cove
  [17.6650, 83.2865], // Yarada Hill Coastal Curve
  [17.6742, 83.2975], // Dolphin's Nose South Point
  [17.6782, 83.3002], // Dolphin's Nose East Tip (jutting into Bay of Bengal)
  [17.6845, 83.2968], // South Breakwater / Harbor Entrance
  [17.6895, 83.2980], // Ross Hill / North Breakwater
  [17.6980, 83.3068], // Fishing Harbour
  [17.7072, 83.3168], // Harbour Park Coast
  [17.7142, 83.3250], // RK Beach South Promenade
  [17.7176, 83.3289], // INS Kursura Shoreline
  [17.7248, 83.3360], // VUDA Park / Lawson's Bay
  [17.7458, 83.3508], // Tenneti Park / Kailasagiri Foothill
  [17.7625, 83.3672], // Sagar Nagar
  [17.7822, 83.3878], // Rushikonda Surfing Bay
  [17.8150, 83.4045], // Thimmapuram
  [17.8485, 83.4285], // Mangamaripeta
  [17.8915, 83.4545], // Bheemili River Mouth & Beach
  [17.9260, 83.4760]  // Far North Coast
];

export const COASTLINE_WORLD = COASTLINE_LATLNG.map(([lat, lng]) => latLngToWorld(lat, lng));

// Visakhapatnam Port Inner Entrance Channel & Basin Water Polygon (cuts inland between Ross Hill & Dolphin's Nose)
export const PORT_CHANNEL_LATLNG = [
  [17.6846, 83.2978],
  [17.6852, 83.2860],
  [17.6885, 83.2792],
  [17.6915, 83.2835],
  [17.6892, 83.2982]
];
export const PORT_CHANNEL_WORLD = PORT_CHANNEL_LATLNG.map(([lat, lng]) => latLngToWorld(lat, lng));

// Connected Geographic Road Centerlines in WGS84 -> Projected World Coordinates
const RAW_ROADS = [
  // 1. NTR Beach Road / Coastal Highway (Harbour Park -> RK Beach -> Kursura -> VUDA Park -> Tenneti -> Rushikonda -> Bheemili)
  { p1: [17.7070, 83.3145], p2: [17.7142, 83.3226], width: 16, name: 'RK Beach Road South', hasMedian: true, hasKerb: true },
  { p1: [17.7142, 83.3226], p2: [17.7176, 83.3266], width: 16, name: 'INS Kursura Promenade Rd', hasMedian: true, hasKerb: true },
  { p1: [17.7176, 83.3266], p2: [17.7235, 83.3322], width: 16, name: 'VUDA Park Beach Rd', hasMedian: true, hasKerb: true },
  { p1: [17.7235, 83.3322], p2: [17.7452, 83.3474], width: 16, name: 'Lawsons Bay Tenneti Rd', hasMedian: true, hasKerb: true },
  { p1: [17.7452, 83.3474], p2: [17.7492, 83.3422], width: 12, name: 'Kailasagiri Ghat Climb', hasMedian: false, hasKerb: true },
  { p1: [17.7452, 83.3474], p2: [17.7825, 83.3852], width: 15, name: 'Rushikonda Beach Hwy', hasMedian: true, hasKerb: true },
  { p1: [17.7825, 83.3852], p2: [17.8902, 83.4520], width: 14, name: 'Bheemili Beach Hwy', hasMedian: true, hasKerb: true },

  // 2. Rushikonda <-> Madhurawada IT Hills <-> Simhachalam
  { p1: [17.7825, 83.3852], p2: [17.8055, 83.3560], width: 14, name: 'IT Hills Panorama Rd', hasMedian: true, hasKerb: false },
  { p1: [17.8055, 83.3560], p2: [17.7765, 83.2495], width: 14, name: 'Adavivaram BRTS Link', hasMedian: false, hasKerb: false },

  // 3. RK Beach <-> Jagadamba <-> Siripuram <-> Dwaraka Nagar <-> MVP Colony
  { p1: [17.7070, 83.3145], p2: [17.7122, 83.3025], width: 15, name: 'Jagadamba Collectorate Rd', hasMedian: true, hasKerb: true },
  { p1: [17.7142, 83.3226], p2: [17.7224, 83.3150], width: 15, name: 'Siripuram VIP Rd', hasMedian: true, hasKerb: true },
  { p1: [17.7122, 83.3025], p2: [17.7224, 83.3150], width: 14, name: 'Waltair Uplands Link', hasMedian: false, hasKerb: true },
  { p1: [17.7122, 83.3025], p2: [17.7285, 83.3015], width: 15, name: 'Daba Gardens Asilmetta Rd', hasMedian: true, hasKerb: true },
  { p1: [17.7224, 83.3150], p2: [17.7285, 83.3015], width: 15, name: 'Asilmetta VIP Corridor', hasMedian: true, hasKerb: true },

  // 4. MVP Colony Grid & NH-16 Maddilapalem <-> Madhurawada
  { p1: [17.7235, 83.3322], p2: [17.7415, 83.3315], width: 15, name: 'MVP Double Rd', hasMedian: true, hasKerb: true },
  { p1: [17.7224, 83.3150], p2: [17.7415, 83.3315], width: 13, name: 'Pedda Waltair Uplands Rd', hasMedian: false, hasKerb: false },
  { p1: [17.7415, 83.3315], p2: [17.7285, 83.3015], width: 15, name: 'Maddilapalem NH-16', hasMedian: true, hasKerb: false },
  { p1: [17.7415, 83.3315], p2: [17.8055, 83.3560], width: 15, name: 'NH-16 Madhurawada Hwy', hasMedian: true, hasKerb: false },

  // 5. Dwaraka Nagar <-> NAD Junction <-> Simhachalam
  { p1: [17.7285, 83.3015], p2: [17.7445, 83.2320], width: 16, name: 'NAD NH-16 Corridor', hasMedian: true, hasKerb: false },
  { p1: [17.7445, 83.2320], p2: [17.7765, 83.2495], width: 14, name: 'Simhachalam BRTS Rd', hasMedian: true, hasKerb: false },

  // 6. Harbour / Jagadamba -> Visakhapatnam Port -> Channel Bridge -> Dolphin's Nose -> Yarada Hills -> Yarada Beach -> Gajuwaka
  { p1: [17.7122, 83.3025], p2: [17.6945, 83.2915], width: 15, name: 'Convent Junction Port Rd', hasMedian: true, hasKerb: false },
  { p1: [17.7070, 83.3145], p2: [17.6945, 83.2915], width: 14, name: 'Fishing Harbor Waterfront Rd', hasMedian: false, hasKerb: true },
  { p1: [17.6945, 83.2915], p2: [17.6840, 83.2855], width: 14, name: 'Port Channel Harbor Bridge', hasMedian: false, hasKerb: true, isBridge: true },
  { p1: [17.6840, 83.2855], p2: [17.6775, 83.2948], width: 11, name: 'Dolphins Nose Ghat Spur', hasMedian: false, hasKerb: true },
  { p1: [17.6840, 83.2855], p2: [17.6690, 83.2790], width: 13, name: 'Yarada Hills Coastal Ghat', hasMedian: false, hasKerb: true },
  { p1: [17.6690, 83.2790], p2: [17.6548, 83.2712], width: 13, name: 'Yarada Cove Descent Rd', hasMedian: false, hasKerb: true },
  { p1: [17.6548, 83.2712], p2: [17.6868, 83.2185], width: 13, name: 'Yarada–Scindia West Link', hasMedian: false, hasKerb: false },
  { p1: [17.6945, 83.2915], p2: [17.6868, 83.2185], width: 16, name: 'Port–Gajuwaka Expy', hasMedian: true, hasKerb: false },
  { p1: [17.7445, 83.2320], p2: [17.6868, 83.2185], width: 16, name: 'Airport–Gajuwaka NH-16', hasMedian: true, hasKerb: false },
  { p1: [17.6868, 83.2185], p2: [17.6380, 83.1680], width: 16, name: 'Steel Plant NH-16 Hwy', hasMedian: true, hasKerb: false },

  // 7. Connected Residential Urban Grid (Pandurangapuram, Maharanipeta, Lawson's Bay, MVP Sectors)
  { p1: [17.7130, 83.3180], p2: [17.7142, 83.3226], width: 10, name: 'Pandurangapuram Coast Lane', hasMedian: false, hasKerb: true },
  { p1: [17.7130, 83.3180], p2: [17.7195, 83.3198], width: 10, name: 'Pandurangapuram Interior St', hasMedian: false, hasKerb: true },
  { p1: [17.7195, 83.3198], p2: [17.7235, 83.3322], width: 10, name: 'Waltair Park Cross St', hasMedian: false, hasKerb: true },
  { p1: [17.7340, 83.3335], p2: [17.7415, 83.3315], width: 10, name: 'MVP Sector 4 Street', hasMedian: false, hasKerb: true }
];

export const ROAD_SEGMENTS = RAW_ROADS.map((r) => {
  const a = latLngToWorld(r.p1[0], r.p1[1]);
  const b = latLngToWorld(r.p2[0], r.p2[1]);
  return {
    x1: a.x,
    z1: a.z,
    x2: b.x,
    z2: b.z,
    width: r.width,
    name: r.name,
    hasMedian: r.hasMedian,
    hasKerb: r.hasKerb,
    isBridge: Boolean(r.isBridge)
  };
});

// Elevated Asilmetta–Dwaraka Flyover Overpass
const FLY_P1 = latLngToWorld(17.7238, 83.3118);
const FLY_P2 = latLngToWorld(17.7276, 83.3036);
export const FLYOVER_SEGMENTS = [
  {
    id: 'asilmetta_flyover',
    name: 'Asilmetta–Dwaraka Flyover',
    x1: FLY_P1.x,
    z1: FLY_P1.z,
    x2: FLY_P2.x,
    z2: FLY_P2.z,
    width: 10.5,
    deckElevation: 5.2
  }
];

const RAW_JUNCTIONS = [
  { lat: 17.7142, lng: 83.3226, name: 'RK Beach Main Crossing', hasSignal: true, hasCrosswalk: true },
  { lat: 17.7176, lng: 83.3266, name: 'INS Kursura Park Crossing', hasSignal: true, hasCrosswalk: true },
  { lat: 17.7235, lng: 83.3322, name: 'VUDA Park / Beach Rd Junction', hasSignal: true, hasCrosswalk: true },
  { lat: 17.7224, lng: 83.3150, name: 'Siripuram Junction Circle', isRoundabout: true },
  { lat: 17.7122, lng: 83.3025, name: 'Jagadamba Centre', isRoundabout: true },
  { lat: 17.7285, lng: 83.3015, name: 'Dwaraka Nagar RTC Junction', hasSignal: true, hasCrosswalk: true },
  { lat: 17.7445, lng: 83.2320, name: 'NAD Flyover Rotary', isRoundabout: true }
];

export const JUNCTION_NODES = RAW_JUNCTIONS.map((j) => {
  const w = latLngToWorld(j.lat, j.lng);
  return { ...j, x: w.x, z: w.z };
});

// Curated Points of Interest (projected from authentic WGS84 coordinates)
export const CURATED_POIS = [
  { id: 'poi_kursura', name: 'INS Kursura (S20) Submarine Museum', lat: 17.7172, lng: 83.3275, category: 'Landmark' },
  { id: 'poi_victory', name: 'Victory at Sea War Memorial', lat: 17.7124, lng: 83.3220, category: 'Landmark' },
  { id: 'poi_dolphins_nose', name: "Dolphin's Nose Lighthouse", lat: 17.6775, lng: 83.2948, category: 'Headland' },
  { id: 'poi_kailasagiri', name: 'Kailasagiri Peak & Viewpoint', lat: 17.7492, lng: 83.3422, category: 'Hilltop' },
  { id: 'poi_yarada', name: 'Yarada Beach Scenic Cove', lat: 17.6548, lng: 83.2712, category: 'Beach' },
  { id: 'poi_port', name: 'Visakhapatnam Port Terminal', lat: 17.6945, lng: 83.2915, category: 'Harbor' },
  { id: 'poi_rushikonda', name: 'Rushikonda Surfing Bay', lat: 17.7825, lng: 83.3852, category: 'Beach' },
  { id: 'poi_simhachalam', name: 'Simhachalam Temple Hill', lat: 17.7765, lng: 83.2495, category: 'Heritage' }
].map((p) => ({ ...p, ...latLngToWorld(p.lat, p.lng) }));

// Curated VMRDA Master Plan Land-Use Polygons
export const CURATED_LANDUSE_ZONES = [
  {
    id: 'lu_rk_coastal',
    name: 'CRZ Coastal Tourism & Promenade',
    zone: 'coastal',
    colorHex: '#0ea5e9',
    polygonLatLng: [
      [17.705, 83.314], [17.735, 83.343], [17.736, 83.337], [17.707, 83.309]
    ]
  },
  {
    id: 'lu_kailasagiri_forest',
    name: 'Eastern Ghats Green Reserve (Kailasagiri)',
    zone: 'forest',
    colorHex: '#16a34a',
    polygonLatLng: [
      [17.740, 83.335], [17.758, 83.352], [17.756, 83.333], [17.741, 83.326]
    ]
  },
  {
    id: 'lu_yarada_hills',
    name: "Yarada & Dolphin's Nose Hill Reserve",
    zone: 'forest',
    colorHex: '#15803d',
    polygonLatLng: [
      [17.656, 83.262], [17.680, 83.285], [17.679, 83.299], [17.654, 83.276]
    ]
  },
  {
    id: 'lu_siripuram_comm',
    name: 'Central Commercial Core (Siripuram–Dwaraka–Jagadamba)',
    zone: 'commercial',
    colorHex: '#ec4899',
    polygonLatLng: [
      [17.709, 83.296], [17.733, 83.296], [17.730, 83.318], [17.709, 83.315]
    ]
  },
  {
    id: 'lu_mvp_res',
    name: 'MVP Colony Planned Residential Zone',
    zone: 'residential',
    colorHex: '#f59e0b',
    polygonLatLng: [
      [17.732, 83.323], [17.747, 83.338], [17.747, 83.322], [17.732, 83.316]
    ]
  },
  {
    id: 'lu_port_maritime',
    name: 'Visakhapatnam Maritime & Dockyard Zone',
    zone: 'port',
    colorHex: '#6366f1',
    polygonLatLng: [
      [17.686, 83.275], [17.704, 83.276], [17.703, 83.302], [17.686, 83.298]
    ]
  },
  {
    id: 'lu_steel_ind',
    name: 'Vizag Steel & Heavy Industrial Corridor',
    zone: 'industrial',
    colorHex: '#ef4444',
    polygonLatLng: [
      [17.624, 83.150], [17.665, 83.185], [17.658, 83.210], [17.622, 83.182]
    ]
  }
].map((z) => ({
  ...z,
  pts: z.polygonLatLng.map(([lat, lng]) => latLngToWorld(lat, lng))
}));

// Curated Geographic Building Footprints around RK Beach, Kursura Park, Pandurangapuram & Siripuram
export const CURATED_FOOTPRINTS = [
  { id: 'fp_novotel', name: 'Coastal Bayfront Hotel', lat: 17.7108, lng: 83.3170, w: 22, d: 15, height: 24, tint: '#DDE9F5' },
  { id: 'fp_palm_beach', name: 'Palm Beach Resort Block', lat: 17.7185, lng: 83.3238, w: 19, d: 14, height: 18, tint: '#F2DAC0' },
  { id: 'fp_au_convention', name: 'AU Beach Convention Hall', lat: 17.7210, lng: 83.3270, w: 24, d: 16, height: 14, tint: '#EFE5D8' },
  { id: 'fp_siripuram_mall', name: 'Siripuram Commerce Atrium', lat: 17.7215, lng: 83.3125, w: 22, d: 18, height: 28, tint: '#9DC0E0' },
  { id: 'fp_dwaraka_rtc', name: 'Dwaraka Bus Terminal Complex', lat: 17.7295, lng: 83.3038, w: 26, d: 16, height: 15, tint: '#E2CFC0' }
].map((b) => {
  const center = latLngToWorld(b.lat, b.lng);
  const hw = b.w * 0.5;
  const hd = b.d * 0.5;
  return {
    kind: 'POLYGON',
    name: b.name,
    props: { height: b.height, tint: b.tint, curated: true },
    pts: [
      { x: center.x - hw, z: center.z - hd },
      { x: center.x + hw, z: center.z - hd },
      { x: center.x + hw, z: center.z + hd },
      { x: center.x - hw, z: center.z + hd }
    ]
  };
});

// Fast geometric helpers for analytic fallback + Coastline X interpolation
export function getCoastlineXAnalytic(z) {
  const pts = COASTLINE_WORLD;
  // COASTLINE_WORLD is ordered South (+Z) -> North (-Z)
  if (z >= pts[0].z) return pts[0].x;
  if (z <= pts[pts.length - 1].z) return pts[pts.length - 1].x;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (z <= a.z && z >= b.z) {
      const span = Math.max(0.001, a.z - b.z);
      const t = (a.z - z) / span;
      return a.x + (b.x - a.x) * t;
    }
  }
  return 11.0;
}

function pointInPolygonXZ(x, z, polyPts) {
  let inside = false;
  for (let i = 0, j = polyPts.length - 1; i < polyPts.length; j = i++) {
    const xi = polyPts[i].x;
    const zi = polyPts[i].z;
    const xj = polyPts[j].x;
    const zj = polyPts[j].z;
    const intersect = (zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToPolylineXZ(px, pz, pts) {
  let minD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x;
    const az = pts[i].z;
    const bx = pts[i + 1].x;
    const bz = pts[i + 1].z;
    const vx = bx - ax;
    const vz = bz - az;
    const lenSq = vx * vx + vz * vz;
    let t = lenSq > 0.0001 ? ((px - ax) * vx + (pz - az) * vz) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - (ax + t * vx), pz - (az + t * vz));
    if (d < minD) minD = d;
  }
  return minD;
}

// Signed Coastline Distance: > 0 means ON LAND (meters inland from water), < 0 means OCEAN / HARBOR WATER
export function getCoastSignedDistanceAnalytic(x, z) {
  const coastX = getCoastlineXAnalytic(z);
  const dPoly = distToPolylineXZ(x, z, COASTLINE_WORLD);
  let signed = x > coastX ? -dPoly : dPoly;

  // Carve out Visakhapatnam Port Inner Harbor Channel water inlet
  if (pointInPolygonXZ(x, z, PORT_CHANNEL_WORLD)) {
    const channelLoop = [...PORT_CHANNEL_WORLD, PORT_CHANNEL_WORLD[0]];
    const dChan = distToPolylineXZ(x, z, channelLoop);
    signed = Math.min(signed, -Math.max(1.5, dChan));
  }
  return signed;
}

export function getCoastlineX(z) {
  return getCoastlineXAnalytic(z);
}

export function getCoastSignedDistance(x, z) {
  if (activeGisManager) {
    return activeGisManager.sampleCoastSignedDistance(x, z);
  }
  return getCoastSignedDistanceAnalytic(x, z);
}

export function getBaseDemElevationAnalytic(x, z) {
  const distFromWater = getCoastSignedDistanceAnalytic(x, z);
  if (distFromWater <= 0) {
    return Math.max(-5.5, distFromWater * 0.14);
  }

  let h = 1.85;
  if (distFromWater < 30) {
    const t = distFromWater / 30;
    h = t * t * 1.15 + t * 0.70;
  } else {
    const coastX = getCoastlineXAnalytic(z);
    const inlandDist = Math.max(0, coastX - x - 30);
    h = 1.85 + Math.min(6.5, inlandDist * 0.007) + Math.sin(x * 0.009) * Math.cos(z * 0.009) * 0.42;
  }

  // Smooth Hermite hill peaks grounded at authentic Visakhapatnam WGS84 hill coordinates
  const addHill = (lat, lng, radius, peakH) => {
    const c = latLngToWorld(lat, lng);
    const dSq = (x - c.x) * (x - c.x) + (z - c.z) * (z - c.z);
    if (dSq < radius * radius) {
      const t = 1 - Math.sqrt(dSq) / radius;
      h += t * t * (3 - 2 * t) * peakH;
    }
  };

  addHill(17.7492, 83.3422, 165, 32.0); // Kailasagiri Peak & Eastern Ghats spur
  addHill(17.7450, 83.3360, 125, 16.0); // Kailasagiri West Slope
  addHill(17.6775, 83.2932, 95, 22.0);  // Dolphin's Nose Headland Promontory
  addHill(17.6655, 83.2755, 130, 30.0); // Yarada Hills Main Ridge
  addHill(17.6915, 83.2895, 62, 11.5);  // Ross Hill above Port Entrance
  addHill(17.7765, 83.2495, 210, 38.0); // Simhachalam Sacred Hill Range
  addHill(17.8055, 83.3560, 155, 16.5); // Madhurawada IT Hills Ridge
  addHill(17.7705, 83.3740, 95, 12.0);  // Rushikonda South Bluff

  return h;
}

export function getTerrainHeight(x, z) {
  if (activeGisManager) {
    return activeGisManager.getElevationAt(x, z);
  }
  return getBaseDemElevationAnalytic(x, z);
}

export function getFlyoverSurfaceY(seg, tAlong) {
  const base0 = getTerrainHeight(seg.x1, seg.z1);
  const base1 = getTerrainHeight(seg.x2, seg.z2);
  const baseLerp = base0 + (base1 - base0) * tAlong;
  let lift = 1.0;
  if (tAlong < 0.25) {
    const s = tAlong / 0.25;
    lift = s * s * (3 - 2 * s);
  } else if (tAlong > 0.75) {
    const s = (1.0 - tAlong) / 0.25;
    lift = s * s * (3 - 2 * s);
  }
  return baseLerp + lift * seg.deckElevation + 0.12;
}

export function getActiveRoadSegments() {
  if (activeGisManager && activeGisManager.importedRoads.length > 0) {
    return activeGisManager.importedRoads;
  }
  return ROAD_SEGMENTS;
}

export function getDistrictAt(x, z) {
  let best = DISTRICTS[0];
  let bestDist = Infinity;
  for (const d of DISTRICTS) {
    const dist = Math.hypot(x - d.x, z - d.z);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

export function distanceToNearestRoad(px, pz) {
  let minDist = Infinity;
  let nearestSeg = null;
  const segs = getActiveRoadSegments();
  for (const seg of segs) {
    const vx = seg.x2 - seg.x1;
    const vz = seg.z2 - seg.z1;
    const lenSq = vx * vx + vz * vz;
    let t = 0;
    if (lenSq > 0.001) {
      t = ((px - seg.x1) * vx + (pz - seg.z1) * vz) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const cx = seg.x1 + t * vx;
    const cz = seg.z1 + t * vz;
    const d = Math.hypot(px - cx, pz - cz) - seg.width * 0.5;
    if (d < minDist) {
      minDist = d;
      nearestSeg = seg;
    }
  }
  return { clearance: minDist, segment: nearestSeg };
}
