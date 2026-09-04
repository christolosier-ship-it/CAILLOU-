import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLIC = path.join(ROOT, 'public');
const FIVE_MIB = 5 * 1024 * 1024;
const TWO_MIB = 2 * 1024 * 1024;
const ONE_MIB = 1024 * 1024;

const EXPECTED_ACCESSORY_IDS = new Set([
  'monocle', 'bow-tie', 'round-glasses', 'pedestal-gallery',
  'mask-scan', 'mouse-ears', 'traffic-cone', 'bebe-assets', 'chicken',
  'crocodile-dog-toy', 'garden-gnome', 'model', 'poo-scan', 'skull', 'worn-flip-flop',
]);
const COLLISION_STRATEGIES = new Set(['hull', 'cuboid', 'ball', 'compound', 'proxy', 'simplified']);

function invariant(condition, message) {
  if (!condition) throw new Error(`[release] ${message}`);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));
}

function fromPublicUrl(url) {
  invariant(typeof url === 'string' && url.startsWith('/'), `chemin public invalide: ${String(url)}`);
  return path.join(PUBLIC, url.slice(1));
}

async function requireFile(filePath, label) {
  const metadata = await stat(filePath);
  invariant(metadata.isFile(), `${label} doit être un fichier`);
  return metadata;
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function positiveFinite(value) {
  return Number.isFinite(value) && value > 0;
}

async function collectTextFiles(directory) {
  const output = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await collectTextFiles(absolute));
    else if (/\.(?:[cm]?[jt]sx?|json|css|html|md)$/i.test(entry.name)) output.push(absolute);
  }
  return output;
}

async function validateRocks() {
  const catalog = await readJson('public/assets/rocks/catalog.json');
  invariant(Array.isArray(catalog), 'le catalogue des cailloux doit être un tableau');
  invariant(catalog.length === 20, `20 cailloux attendus, ${catalog.length} trouvés`);

  const expectedIds = new Set(Array.from({ length: 20 }, (_, index) => `rock-${String(index + 1).padStart(3, '0')}`));
  let maxBytes = 0;
  for (const rock of catalog) {
    invariant(expectedIds.delete(rock.id), `identifiant de caillou inattendu ou dupliqué: ${rock.id}`);
    invariant(rock.validation?.externalDependencies === 0, `${rock.id}: dépendance GLB externe interdite`);
    invariant(Number.isFinite(rock.validation?.triangleCountFromGlb) && rock.validation.triangleCountFromGlb > 0, `${rock.id}: triangle count manquant`);

    const model = await requireFile(fromPublicUrl(rock.modelPath), `${rock.id} model.glb`);
    const preview = await requireFile(fromPublicUrl(rock.previewPath), `${rock.id} preview`);
    invariant(model.size <= FIVE_MIB, `${rock.id}: GLB ${model.size} octets > budget 5 MiB`);
    invariant(model.size === rock.validation?.bytes, `${rock.id}: taille GLB différente du catalogue`);
    invariant(preview.size > 0, `${rock.id}: preview vide`);
    maxBytes = Math.max(maxBytes, model.size);
  }
  invariant(expectedIds.size === 0, `cailloux absents: ${[...expectedIds].join(', ')}`);
  return { count: catalog.length, maxBytes };
}

async function validateAccessories() {
  const catalog = await readJson('public/assets/accessories/catalog.json');
  invariant(catalog?.schemaVersion === 2, 'schemaVersion accessoires inattendue');
  invariant(Array.isArray(catalog.accessories), 'catalogue accessoires invalide');
  invariant(catalog.accessories.length === EXPECTED_ACCESSORY_IDS.size, `${EXPECTED_ACCESSORY_IDS.size} accessoires attendus, ${catalog.accessories.length} trouvés`);

  const remainingIds = new Set(EXPECTED_ACCESSORY_IDS);
  let maxBytes = 0;
  let proxyCount = 0;

  for (const accessory of catalog.accessories) {
    invariant(typeof accessory.id === 'string' && /^[a-z0-9-]+$/.test(accessory.id), `ID accessoire invalide: ${String(accessory.id)}`);
    invariant(remainingIds.delete(accessory.id), `accessoire inattendu ou dupliqué: ${accessory.id}`);
    invariant(typeof accessory.name === 'string' && accessory.name.trim().length > 0, `${accessory.id}: nom absent`);
    invariant(typeof accessory.description === 'string' && accessory.description.trim().length > 0, `${accessory.id}: description absente`);
    invariant(positiveInteger(accessory.priceLithons), `${accessory.id}: prix Lithons invalide`);
    invariant(typeof accessory.category === 'string' && /^[a-z][a-z0-9_-]{0,31}$/.test(accessory.category), `${accessory.id}: catégorie invalide`);
    invariant(Number.isInteger(accessory.sortOrder), `${accessory.id}: sortOrder invalide`);
    invariant(positiveInteger(accessory.triangleCount), `${accessory.id}: triangleCount invalide`);
    invariant(Array.isArray(accessory.dimensions) && accessory.dimensions.length === 3 && accessory.dimensions.every(positiveFinite), `${accessory.id}: dimensions invalides`);
    invariant(positiveFinite(accessory.scaleMin) && positiveFinite(accessory.scaleMax) && accessory.scaleMax >= accessory.scaleMin, `${accessory.id}: limites d'échelle invalides`);
    invariant(accessory.physics && typeof accessory.physics === 'object' && !Array.isArray(accessory.physics), `${accessory.id}: metadata physics absente`);

    const collision = accessory.collision;
    invariant(collision && typeof collision === 'object' && !Array.isArray(collision), `${accessory.id}: metadata collision absente`);
    invariant(COLLISION_STRATEGIES.has(collision.strategy), `${accessory.id}: stratégie collision invalide`);
    invariant(collision.geometrySource === 'render' || collision.geometrySource === 'proxy', `${accessory.id}: geometrySource invalide`);

    const budget = accessory.budget;
    invariant(budget && typeof budget === 'object' && !Array.isArray(budget), `${accessory.id}: budget absent`);
    invariant(positiveInteger(budget.runtimeModelBytes), `${accessory.id}: runtimeModelBytes invalide`);
    if (budget.maxTextureDimension !== undefined) {
      invariant(positiveInteger(budget.maxTextureDimension) && budget.maxTextureDimension <= 1024, `${accessory.id}: texture > 1024 px`);
    }
    if (budget.largestTextureBytes !== undefined) {
      invariant(positiveInteger(budget.largestTextureBytes), `${accessory.id}: largestTextureBytes invalide`);
    }

    invariant(accessory.modelPath === `/assets/accessories/${accessory.id}/model.glb`, `${accessory.id}: modelPath non canonique`);
    invariant(accessory.previewPath === `/assets/accessory-previews/${accessory.id}.png`, `${accessory.id}: previewPath non canonique`);

    const model = await requireFile(fromPublicUrl(accessory.modelPath), `${accessory.id} model.glb`);
    const preview = await requireFile(fromPublicUrl(accessory.previewPath), `${accessory.id} preview`);
    invariant(model.size <= FIVE_MIB, `${accessory.id}: GLB ${model.size} octets > budget 5 MiB`);
    invariant(model.size === budget.runtimeModelBytes, `${accessory.id}: runtimeModelBytes ${budget.runtimeModelBytes} != ${model.size}`);
    invariant(preview.size > 0 && preview.size <= TWO_MIB, `${accessory.id}: preview vide ou > 2 MiB`);
    if (budget.largestTextureBytes !== undefined) invariant(budget.largestTextureBytes <= model.size, `${accessory.id}: texture embarquée > GLB`);

    if (collision.geometrySource === 'proxy') {
      const expectedProxy = `/assets/accessories/${accessory.id}/collider.glb`;
      invariant(collision.proxyPath === expectedProxy, `${accessory.id}: proxyPath non canonique`);
      const proxy = await requireFile(fromPublicUrl(collision.proxyPath), `${accessory.id} collider.glb`);
      invariant(proxy.size > 0 && proxy.size <= ONE_MIB, `${accessory.id}: collider vide ou > 1 MiB`);
      proxyCount += 1;
    } else {
      invariant(collision.proxyPath === undefined || collision.proxyPath === null, `${accessory.id}: proxyPath interdit avec géométrie render`);
    }

    maxBytes = Math.max(maxBytes, model.size);
  }

  invariant(remainingIds.size === 0, `accessoires absents: ${[...remainingIds].join(', ')}`);
  invariant(proxyCount === 11, `11 colliders proxy V2 attendus, ${proxyCount} trouvés`);
  return { count: catalog.accessories.length, maxBytes, proxyCount };
}

async function validatePwaAndHosting() {
  await requireFile(path.join(PUBLIC, 'icons/pwa-192x192-provisional.png'), 'icône PWA 192');
  await requireFile(path.join(PUBLIC, 'icons/pwa-512x512-provisional.png'), 'icône PWA 512');

  const vercel = await readJson('vercel.json');
  invariant(vercel?.git?.deploymentEnabled?.['**'] === false, 'Vercel doit bloquer les branches non explicitement autorisées');
  invariant(vercel?.git?.deploymentEnabled?.main === true, 'Vercel doit déployer main');
  invariant(vercel?.git?.deploymentEnabled?.['preview/**'] === true, 'Vercel doit autoriser preview/**');

  const headerBlock = vercel.headers?.find((entry) => entry.source === '/(.*)');
  invariant(Boolean(headerBlock), 'headers de sécurité Vercel globaux absents');
  const headers = new Map(headerBlock.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  invariant(headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options invalide');
  invariant(headers.get('x-frame-options') === 'DENY', 'X-Frame-Options invalide');
  invariant(headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Referrer-Policy invalide');
  invariant(headers.get('permissions-policy')?.includes('camera=()'), 'Permissions-Policy doit interdire la caméra');
}

async function validateNoFrontendSecrets() {
  const roots = [path.join(ROOT, 'src'), path.join(ROOT, 'public')];
  const files = (await Promise.all(roots.map(collectTextFiles))).flat();
  files.push(path.join(ROOT, 'vite.config.ts'), path.join(ROOT, 'vercel.json'));

  const forbidden = [
    { name: 'clé secrète Supabase', pattern: /sb_secret_[A-Za-z0-9_-]+/ },
    { name: 'variable service-role Supabase', pattern: /SUPABASE_SERVICE_ROLE(?:_KEY)?\b/ },
  ];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const rule of forbidden) invariant(!rule.pattern.test(content), `${rule.name} détectée côté frontend dans ${path.relative(ROOT, file)}`);
  }
}

const rocks = await validateRocks();
const accessories = await validateAccessories();
await validatePwaAndHosting();
await validateNoFrontendSecrets();

process.stdout.write(
  `[release] OK — ${rocks.count} cailloux (max ${(rocks.maxBytes / 1024 / 1024).toFixed(2)} MiB), ` +
  `${accessories.count} accessoires dont ${accessories.proxyCount} V2 proxy (max ${(accessories.maxBytes / 1024 / 1024).toFixed(2)} MiB), ` +
  'PWA/headers/assets/secrets vérifiés.\n',
);
