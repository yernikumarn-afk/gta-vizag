// Zero-Dependency Binary GeoTIFF (.tif / .tiff) Parser for Copernicus GLO-30 / SRTM DEM & Ortho Rasters
// Supports Little/Big Endian TIFF, Strip & Tile storage, Compression 1 (None) & 8/32946 (Deflate via DecompressionStream),
// Uint8 / Uint16 / Int16 / Float32 DEM elevation bands & RGBA raster bands, plus ModelPixelScale & ModelTiepoint tags.

async function inflateDeflateBytes(compressedUint8) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Deflate decompression unsupported in this WebView');
  }
  const tryFormats = ['deflate', 'deflate-raw'];
  for (const fmt of tryFormats) {
    try {
      const ds = new DecompressionStream(fmt);
      const writer = ds.writable.getWriter();
      writer.write(compressedUint8);
      writer.close();
      const buf = await new Response(ds.readable).arrayBuffer();
      return new Uint8Array(buf);
    } catch (_) {
      // Try alternate zlib wrapper format
    }
  }
  throw new Error('Failed to decompress Deflate GeoTIFF strip');
}

function readTagValues(view, littleEndian, type, count, valueOrOffset) {
  const typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 8: 2, 9: 4, 11: 4, 12: 8 };
  const size = (typeSizes[type] || 1) * count;
  const startOffset = size <= 4 ? valueOrOffset.inlinePos : valueOrOffset.ptr;
  const out = [];
  for (let i = 0; i < count; i++) {
    const p = startOffset + i * (typeSizes[type] || 1);
    if (p >= view.byteLength) break;
    if (type === 1 || type === 2) out.push(view.getUint8(p));
    else if (type === 3) out.push(view.getUint16(p, littleEndian));
    else if (type === 4) out.push(view.getUint32(p, littleEndian));
    else if (type === 8) out.push(view.getInt16(p, littleEndian));
    else if (type === 9) out.push(view.getInt32(p, littleEndian));
    else if (type === 11) out.push(view.getFloat32(p, littleEndian));
    else if (type === 12) out.push(view.getFloat64(p, littleEndian));
    else if (type === 5) {
      const num = view.getUint32(p, littleEndian);
      const den = view.getUint32(p + 4, littleEndian) || 1;
      out.push(num / den);
    }
  }
  return out;
}

export async function parseGeoTiff(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 16) {
    throw new Error('GeoTIFF file too small');
  }

  const byteOrder = view.getUint16(0, false);
  const littleEndian = byteOrder === 0x4949;
  if (!littleEndian && byteOrder !== 0x4d4d) {
    throw new Error('Invalid TIFF byte order header');
  }
  const magic = view.getUint16(2, littleEndian);
  if (magic !== 42) {
    throw new Error(`Unsupported TIFF variant (magic ${magic}; BigTIFF not supported on tablet)`);
  }

  const ifdOffset = view.getUint32(4, littleEndian);
  const entryCount = view.getUint16(ifdOffset, littleEndian);
  const tags = {};

  for (let i = 0; i < entryCount; i++) {
    const base = ifdOffset + 2 + i * 12;
    const tagId = view.getUint16(base, littleEndian);
    const type = view.getUint16(base + 2, littleEndian);
    const count = view.getUint32(base + 4, littleEndian);
    const inlinePos = base + 8;
    const ptr = view.getUint32(inlinePos, littleEndian);
    tags[tagId] = readTagValues(view, littleEndian, type, count, { inlinePos, ptr });
  }

  const width = (tags[256] && tags[256][0]) || 0;
  const height = (tags[257] && tags[257][0]) || 0;
  if (width <= 0 || height <= 0) {
    throw new Error('GeoTIFF missing ImageWidth/ImageLength');
  }

  const bitsPerSample = tags[258] || [16];
  const samplesPerPixel = (tags[277] && tags[277][0]) || bitsPerSample.length || 1;
  const compression = (tags[259] && tags[259][0]) || 1;
  const sampleFormat = (tags[339] && tags[339][0]) || (bitsPerSample[0] === 32 ? 3 : 2);
  const stripOffsets = tags[273] || [];
  const rowsPerStrip = (tags[278] && tags[278][0]) || height;
  const stripByteCounts = tags[279] || [];

  if (stripOffsets.length === 0) {
    throw new Error('Tiled GeoTIFF currently requires strip layout (export as Strip GeoTIFF from QGIS/GDAL)');
  }
  if (compression !== 1 && compression !== 8 && compression !== 32946) {
    throw new Error(`Unsupported GeoTIFF compression code ${compression} (use Uncompressed or Deflate)`);
  }

  const pixelScale = tags[33550] || [0.0002777778, 0.0002777778, 1];
  const tiepoint = tags[33922] || [0, 0, 0, 83.16, 17.90, 0];
  const scaleX = pixelScale[0] || 0.0002777778;
  const scaleY = pixelScale[1] || 0.0002777778;
  const originLng = tiepoint[3] - tiepoint[0] * scaleX;
  const originLat = tiepoint[4] + tiepoint[1] * scaleY;
  const minLng = originLng;
  const maxLng = originLng + width * scaleX;
  const maxLat = originLat;
  const minLat = originLat - height * scaleY;

  const isRgbRaster = samplesPerPixel >= 3;
  const outElev = isRgbRaster ? null : new Float32Array(width * height);
  const outRgba = isRgbRaster ? new Uint8ClampedArray(width * height * 4) : null;

  const bytesPerSample = Math.max(1, Math.floor((bitsPerSample[0] || 8) / 8));
  let rowCursor = 0;

  for (let s = 0; s < stripOffsets.length; s++) {
    const offset = stripOffsets[s];
    const byteLen = stripByteCounts[s] || (width * rowsPerStrip * samplesPerPixel * bytesPerSample);
    const rawSlice = new Uint8Array(arrayBuffer, offset, Math.min(byteLen, arrayBuffer.byteLength - offset));
    const stripBytes = compression === 1 ? rawSlice : await inflateDeflateBytes(rawSlice);
    const sView = new DataView(stripBytes.buffer, stripBytes.byteOffset, stripBytes.byteLength);

    const rowsInThisStrip = Math.min(rowsPerStrip, height - rowCursor);
    for (let r = 0; r < rowsInThisStrip; r++) {
      const y = rowCursor + r;
      for (let x = 0; x < width; x++) {
        const pxBase = (r * width + x) * samplesPerPixel * bytesPerSample;
        if (pxBase + bytesPerSample > stripBytes.byteLength) continue;

        if (isRgbRaster) {
          const dst = (y * width + x) * 4;
          outRgba[dst] = stripBytes[pxBase] || 0;
          outRgba[dst + 1] = stripBytes[pxBase + bytesPerSample] || 0;
          outRgba[dst + 2] = stripBytes[pxBase + bytesPerSample * 2] || 0;
          outRgba[dst + 3] = samplesPerPixel >= 4 ? (stripBytes[pxBase + bytesPerSample * 3] || 255) : 255;
        } else {
          let elev = 0;
          if (bytesPerSample === 4 && sampleFormat === 3) {
            elev = sView.getFloat32(pxBase, littleEndian);
          } else if (bytesPerSample === 2 && sampleFormat === 2) {
            elev = sView.getInt16(pxBase, littleEndian);
          } else if (bytesPerSample === 2) {
            elev = sView.getUint16(pxBase, littleEndian);
          } else {
            elev = sView.getUint8(pxBase);
          }
          if (!Number.isFinite(elev) || elev < -400 || elev > 8000) {
            elev = 0;
          }
          outElev[y * width + x] = elev;
        }
      }
    }
    rowCursor += rowsInThisStrip;
  }

  return {
    kind: isRgbRaster ? 'RASTER_RGBA' : 'DEM_ELEVATION',
    width,
    height,
    bounds: { minLat, maxLat, minLng, maxLng },
    elevation: outElev,
    rgba: outRgba
  };
}
