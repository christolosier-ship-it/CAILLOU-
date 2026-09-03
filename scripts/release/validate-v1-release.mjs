import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLIC = path.join(ROOT, 'public');
const FIVE_MIB = 5 * 1024 * 1024;

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`[release] ${message}`);
  }
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

async function collectTextFiles(directory) {
  const output = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...await collectTextFiles(absolute));
    } else if (/\.(?:[cm]?[jt]sx?|json|css|html|md)$/i.test(entry.name)) {
      output.push(absolute);
    }
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
  invariant(catalog?.schemaVersion === 1, 'schemaVersion accessoires inattendue');
  invariant(Array.isArray(catalog.accessories), 'catalogue accessoires invalide');
  invariant(catalog.accessories.length === 4, `4 accessoires V1 attendus, ${catalog.accessories.length} trouvés`);

  const ids = new Set();
  let maxBytes = 0;
  for (const accessory of catalog.accessories) {
    invariant(!ids.has(accessory.id), `accessoire dupliqué: ${accessory.id}`);
    ids.add(accessory.id);
    invariant(accessory.provenance?.verified === true, `${accessory.id}: provenance non vérifiée`);
    invariant(Boolean(accessory.provenance?.title), `${accessory.id}: titre de provenance absent`);
    invariant(Boolean(accessory.provenance?.license), `${accessory.id}: licence absente`);
    invariant(/^https:\/\//.test(accessory.provenance?.licenseUrl ?? ''), `${accessory.id}: URL de licence absente/invalide`);

    if (/\bCC BY\b/i.test(accessory.provenance.license)) {
      invariant(Boolean(accessory.provenance.author) && !/non identifi/i.test(accessory.provenance.author), `${accessory.id}: auteur obligatoire pour CC BY`);
      invariant(/^https:\/\//.test(accessory.provenance.url ?? ''), `${accessory.id}: source obligatoire pour CC BY`);
    }

    const model = await requireFile(fromPublicUrl(accessory.modelPath), `${accessory.id} model.glb`);
    const preview = await requireFile(fromPublicUrl(accessory.previewPath), `${accessory.id} preview`);
    invariant(model.size <= FIVE_MIB, `${accessory.id}: GLB ${model.size} octets > budget 5 MiB`);
    invariant(preview.size > 0, `${accessory.id}: preview vide`);
    maxBytes = Math.max(maxBytes, model.size);
  }

  const notices = await readFile(path.join(ROOT, 'THIRD-PARTY-NOTICES.md'), 'utf8');
  const monocle = catalog.accessories.find((entry) => entry.id === 'monocle');
  invariant(Boolean(monocle), 'Monocle absent du catalogue');
  for (const required of [monocle.provenance.author, monocle.provenance.url, monocle.provenance.license, monocle.provenance.licenseUrl]) {
    invariant(notices.includes(required), `notice tierce incomplète: ${required}`);
  }

  return { count: catalog.accessories.length, maxBytes };
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
    for (const rule of forbidden) {
      invariant(!rule.pattern.test(content), `${rule.name} détectée côté frontend dans ${path.relative(ROOT, file)}`);
    }
  }
}

const rocks = await validateRocks();
const accessories = await validateAccessories();
await validatePwaAndHosting();
await validateNoFrontendSecrets();

process.stdout.write(`[release] OK — ${rocks.count} cailloux (max ${(rocks.maxBytes / 1024 / 1024).toFixed(2)} MiB), ${accessories.count} accessoires (max ${(accessories.maxBytes / 1024 / 1024).toFixed(2)} MiB), PWA/headers/licences/secrets vérifiés.\n`);
