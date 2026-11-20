// Zero-Dependency GeoJSON & KML Parsers for GIS Layer Reconstruction
// Converts WGS84 coordinates to Local 3D World coordinates and classifies features across 10 Visakhapatnam map layers.
import { latLngToWorld } from './GeoProjection.js';

function toWorldPt(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return null;
  const lng = Number(coord[0]);
  const lat = Number(coord[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const p = latLngToWorld(lat, lng);
  return { x: p.x, z: p.z, lat, lng, alt: coord.length >= 3 ? Number(coord[2]) || 0 : 0 };
}

function classifyGeoJsonFeature(props, geomType, layerHint) {
  if (layerHint && layerHint !== 'auto') return layerHint;
  const p = props || {};
  if (p.building || p['building:levels']) return 'buildings';
  if (p.highway || p.route === 'road') return 'roads';
  if (p.natural === 'coastline') return 'coastline';
  if (p.natural === 'water' || p.waterway || p.harbour) return 'water';
  if (p.landuse || p.zone || p.vmrda_zone) return 'landuse';
  if (p.natural === 'wood' || p.landcover === 'trees' || p.leisure === 'park') return 'vegetation';
  if (p.boundary === 'administrative' || p.ward_no || p.ward_name || p.admin_level) return 'boundaries';
  if (geomType === 'LineString' || geomType === 'MultiLineString') return 'roads';
  if (geomType === 'Point' || geomType === 'MultiPoint') return 'pois';
  return 'boundaries';
}

export function parseGeoJsonText(jsonText, layerHint = 'auto') {
  const doc = JSON.parse(jsonText);
  const rawFeatures = doc.type === 'FeatureCollection'
    ? (doc.features || [])
    : (doc.type === 'Feature' ? [doc] : [{ type: 'Feature', geometry: doc, properties: {} }]);

  const buckets = {
    boundaries: [],
    roads: [],
    buildings: [],
    coastline: [],
    water: [],
    vegetation: [],
    landuse: [],
    pois: []
  };

  let totalFeatures = 0;

  for (const feat of rawFeatures) {
    if (!feat || !feat.geometry) continue;
    const g = feat.geometry;
    const props = feat.properties || {};
    const target = classifyGeoJsonFeature(props, g.type, layerHint);
    const list = buckets[target] || buckets.boundaries;

    const extractLine = (coords) => {
      const pts = coords.map(toWorldPt).filter(Boolean);
      if (pts.length >= 2) {
        list.push({
          kind: 'LINE',
          name: props.name || props.ward_name || props.highway || '',
          props,
          pts
        });
        totalFeatures++;
      }
    };

    const extractPolygon = (rings) => {
      if (!rings || rings.length === 0) return;
      const outer = rings[0].map(toWorldPt).filter(Boolean);
      if (outer.length >= 3) {
        list.push({
          kind: 'POLYGON',
          name: props.name || props.ward_name || props.landuse || '',
          props,
          pts: outer
        });
        totalFeatures++;
      }
    };

    if (g.type === 'Point') {
      const pt = toWorldPt(g.coordinates);
      if (pt) {
        buckets.pois.push({
          kind: 'POINT',
          name: props.name || props.title || 'GIS Landmark',
          props,
          pt
        });
        totalFeatures++;
      }
    } else if (g.type === 'LineString') {
      extractLine(g.coordinates);
    } else if (g.type === 'MultiLineString') {
      for (const line of g.coordinates || []) extractLine(line);
    } else if (g.type === 'Polygon') {
      extractPolygon(g.coordinates);
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates || []) extractPolygon(poly);
    }
  }

  return { buckets, totalFeatures };
}

function parseKmlCoordString(coordText) {
  const tokens = String(coordText || '').trim().split(/\s+/);
  const pts = [];
  for (const tok of tokens) {
    const parts = tok.split(',');
    if (parts.length < 2) continue;
    const lng = Number(parts[0]);
    const lat = Number(parts[1]);
    const alt = parts.length >= 3 ? Number(parts[2]) || 0 : 0;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const w = latLngToWorld(lat, lng);
      pts.push({ x: w.x, z: w.z, lat, lng, alt });
    }
  }
  return pts;
}

export function parseKmlText(xmlText, layerHint = 'auto') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const placemarks = doc.getElementsByTagName('Placemark');

  const buckets = {
    boundaries: [],
    roads: [],
    buildings: [],
    coastline: [],
    water: [],
    vegetation: [],
    landuse: [],
    pois: []
  };

  let totalFeatures = 0;

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName('name')[0];
    const name = nameEl ? nameEl.textContent.trim() : `KML Feature ${i + 1}`;
    const descEl = pm.getElementsByTagName('description')[0];
    const description = descEl ? descEl.textContent.trim() : '';

    const polys = pm.getElementsByTagName('Polygon');
    if (polys.length > 0) {
      const target = layerHint && layerHint !== 'auto' ? layerHint : 'boundaries';
      const bucket = buckets[target] || buckets.boundaries;
      for (let p = 0; p < polys.length; p++) {
        const coordEl = polys[p].getElementsByTagName('coordinates')[0];
        if (!coordEl) continue;
        const pts = parseKmlCoordString(coordEl.textContent);
        if (pts.length >= 3) {
          bucket.push({ kind: 'POLYGON', name, props: { name, description }, pts });
          totalFeatures++;
        }
      }
      continue;
    }

    const lines = pm.getElementsByTagName('LineString');
    if (lines.length > 0) {
      const target = layerHint && layerHint !== 'auto'
        ? layerHint
        : (name.toLowerCase().includes('coast') ? 'coastline' : 'roads');
      const bucket = buckets[target] || buckets.roads;
      for (let l = 0; l < lines.length; l++) {
        const coordEl = lines[l].getElementsByTagName('coordinates')[0];
        if (!coordEl) continue;
        const pts = parseKmlCoordString(coordEl.textContent);
        if (pts.length >= 2) {
          bucket.push({ kind: 'LINE', name, props: { name, description }, pts });
          totalFeatures++;
        }
      }
      continue;
    }

    const points = pm.getElementsByTagName('Point');
    for (let ptIdx = 0; ptIdx < points.length; ptIdx++) {
      const coordEl = points[ptIdx].getElementsByTagName('coordinates')[0];
      if (!coordEl) continue;
      const pts = parseKmlCoordString(coordEl.textContent);
      if (pts.length >= 1) {
        buckets.pois.push({ kind: 'POINT', name, props: { name, description }, pt: pts[0] });
        totalFeatures++;
      }
    }
  }

  return { buckets, totalFeatures };
}
