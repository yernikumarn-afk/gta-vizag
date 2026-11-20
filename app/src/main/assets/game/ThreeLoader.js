// Resilient Three.js & GLTFLoader module loader for Android tablets
const CORE_URLS = [
  'three',
  'https://unpkg.com/three@0.169.0/build/three.module.js'
];

const GLTF_URLS = [
  'three/addons/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js'
];

export async function loadThreeModule() {
  let THREE = null;
  let lastError = null;
  for (const url of CORE_URLS) {
    try {
      const mod = await import(url);
      if (mod && mod.WebGLRenderer) {
        THREE = mod;
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }
  if (!THREE) {
    throw lastError || new Error('Failed to load Three.js WebGL core');
  }

  let GLTFLoader = null;
  for (const gUrl of GLTF_URLS) {
    try {
      const gMod = await import(gUrl);
      if (gMod && gMod.GLTFLoader) {
        GLTFLoader = gMod.GLTFLoader;
        break;
      }
    } catch (_) {
      // Continue if addon fetch fails offline
    }
  }

  return { THREE, GLTFLoader };
}
