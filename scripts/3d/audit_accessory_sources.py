#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import traceback

import bpy
from mathutils import Vector

MODELS = {'.blend', '.fbx', '.glb', '.gltf', '.obj'}
TEXTURES = {'.png', '.jpg', '.jpeg', '.webp', '.exr', '.tif', '.tiff', '.bmp'}


def args():
    raw = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--resource', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--markdown', type=Path, required=True)
    return p.parse_args(raw)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load_model(path: Path):
    ext = path.suffix.lower()
    if ext == '.blend':
        bpy.ops.wm.open_mainfile(filepath=str(path.resolve()))
    else:
        reset()
        fp = str(path.resolve())
        if ext in {'.glb', '.gltf'}:
            bpy.ops.import_scene.gltf(filepath=fp)
        elif ext == '.fbx':
            if hasattr(bpy.ops.wm, 'fbx_import'):
                bpy.ops.wm.fbx_import(filepath=fp)
            else:
                bpy.ops.import_scene.fbx(filepath=fp)
        elif ext == '.obj':
            if hasattr(bpy.ops.wm, 'obj_import'):
                bpy.ops.wm.obj_import(filepath=fp)
            else:
                bpy.ops.import_scene.obj(filepath=fp)
        else:
            raise RuntimeError(f'format unsupported: {ext}')


def rounded(v):
    return round(float(v), 6) if math.isfinite(float(v)) else None


def audit_model(path: Path):
    out = {'source': path.name, 'format': path.suffix.lower()[1:], 'bytes': path.stat().st_size, 'status': 'ok'}
    try:
        load_model(path)
        deps = bpy.context.evaluated_depsgraph_get()
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.visible_get()]
        tri = verts = polys = 0
        lo = Vector((math.inf, math.inf, math.inf))
        hi = Vector((-math.inf, -math.inf, -math.inf))
        mats = set()
        for obj in meshes:
            ev = obj.evaluated_get(deps)
            mesh = ev.to_mesh()
            try:
                mesh.calc_loop_triangles()
                tri += len(mesh.loop_triangles)
                verts += len(mesh.vertices)
                polys += len(mesh.polygons)
                for c in ev.bound_box:
                    p = ev.matrix_world @ Vector(c)
                    lo.x, lo.y, lo.z = min(lo.x, p.x), min(lo.y, p.y), min(lo.z, p.z)
                    hi.x, hi.y, hi.z = max(hi.x, p.x), max(hi.y, p.y), max(hi.z, p.z)
            finally:
                ev.to_mesh_clear()
            for slot in obj.material_slots:
                if slot.material:
                    mats.add(slot.material.name_full)
        if not meshes or tri <= 0:
            out['status'] = 'reject'
            out['error'] = 'no render mesh triangles'
            return out
        dims = hi - lo
        center = (lo + hi) * 0.5
        base = Vector((center.x, center.y, lo.z))
        scale = max(dims.x, dims.y, dims.z, 1e-9)
        cdist = center.length / scale
        bdist = base.length / scale
        pivot = 'bounds-center' if cdist <= 0.03 else 'base-center' if bdist <= 0.05 else 'offset'
        images = []
        for image in bpy.data.images:
            if image.name in {'Render Result', 'Viewer Node'}:
                continue
            resolved = ''
            exists = None
            if image.filepath:
                try:
                    resolved = bpy.path.abspath(image.filepath, library=image.library)
                    exists = Path(resolved).exists()
                except Exception:
                    pass
            images.append({
                'name': image.name_full,
                'filepath': image.filepath,
                'resolved': resolved,
                'exists': exists,
                'width': int(image.size[0]),
                'height': int(image.size[1]),
                'packed': bool(image.packed_file),
            })
        armatures = sum(1 for o in bpy.context.scene.objects if o.type == 'ARMATURE')
        actions = len(bpy.data.actions)
        thinness = min(dims) / max(dims) if max(dims) > 0 else 1
        if armatures or actions:
            collider = 'static-only-after-bake'
        elif tri > 250000:
            collider = 'dedicated-proxy'
        elif tri > 60000:
            collider = 'simplified-proxy'
        elif len(meshes) > 8:
            collider = 'compound-convex-candidate'
        elif thinness < 0.08:
            collider = 'compound-or-proxy-candidate'
        else:
            collider = 'convex-hull-candidate'
        out.update({
            'meshCount': len(meshes), 'triangles': tri, 'vertices': verts, 'polygons': polys,
            'dimensions': [rounded(dims.x), rounded(dims.y), rounded(dims.z)],
            'pivot': pivot, 'boundsCenter': [rounded(center.x), rounded(center.y), rounded(center.z)],
            'materialCount': len(mats), 'materials': sorted(mats), 'images': images,
            'armatureCount': armatures, 'actionCount': actions, 'colliderHint': collider,
        })
    except Exception as exc:
        out['status'] = 'error'
        out['error'] = f'{type(exc).__name__}: {exc}'
        out['traceback'] = traceback.format_exc(limit=6)
    return out


def audit_texture(path: Path):
    reset()
    out = {'source': path.name, 'bytes': path.stat().st_size, 'status': 'ok'}
    try:
        img = bpy.data.images.load(str(path.resolve()), check_existing=False)
        out.update(width=int(img.size[0]), height=int(img.size[1]), channels=int(img.channels), fileFormat=str(img.file_format))
    except Exception as exc:
        out['status'] = 'error'
        out['error'] = f'{type(exc).__name__}: {exc}'
    return out


def sha256(path: Path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def mib(n):
    return round(n / 1024 / 1024, 2)


def verdict(model):
    if model['status'] != 'ok':
        return 'REJECT'
    tri = model['triangles']
    image_max = max([max(i['width'], i['height']) for i in model.get('images', [])] or [0])
    if model.get('armatureCount') or model.get('actionCount'):
        return 'REWORK'
    if tri > 250000 or image_max > 4096:
        return 'HEAVY'
    if tri > 50000 or image_max > 2048:
        return 'OPTIMIZE'
    return 'CANDIDATE'


def render_markdown(payload):
    lines = [
        '# V2-03 Lot A — audit Ressource', '',
        f"Blender: `{payload['blenderVersion']}`", '',
        '| Source | Format | Poids | Triangles | Dimensions | Pivot | Mat. | Collider indicatif | Verdict |',
        '|---|---:|---:|---:|---|---|---:|---|---|',
    ]
    for m in payload['models']:
        dims = ' × '.join(str(v) for v in m.get('dimensions', [])) or '—'
        lines.append(f"| `{m['source']}` | {m['format']} | {mib(m['bytes'])} MiB | {m.get('triangles', '—')} | {dims} | {m.get('pivot', '—')} | {m.get('materialCount', '—')} | {m.get('colliderHint', '—')} | **{m['verdict']}** |")
    lines += ['', '## Textures', '', '| Fichier | Poids | Résolution | Statut |', '|---|---:|---:|---|']
    for t in payload['textures']:
        res = f"{t.get('width', '—')}×{t.get('height', '—')}"
        lines.append(f"| `{t['source']}` | {mib(t['bytes'])} MiB | {res} | {t['status']} |")
    if payload['otherFiles']:
        lines += ['', '## Fichiers hors pipeline', '']
        for f in payload['otherFiles']:
            lines.append(f"- `{f['source']}` — {f['bytes']} octets — **{f['classification']}**")
    if payload['duplicates']:
        lines += ['', '## Doublons binaires', '']
        for d in payload['duplicates']:
            lines.append('- ' + ', '.join(f'`{name}`' for name in d))
    lines += ['', '## Règles de lecture', '', '- `CANDIDATE`: coût brut compatible avec une préparation normale.', '- `OPTIMIZE`: décimation et/ou réduction texture requise.', '- `HEAVY`: source très coûteuse, proxy collider dédié et optimisation forte obligatoires.', '- `REWORK`: rig/animation à figer ou nettoyer avant V2.0.', '- `REJECT`: source illisible ou sans géométrie exploitable.', '']
    return '\n'.join(lines)


def main():
    a = args()
    resource = a.resource
    models, textures, others = [], [], []
    hashes = {}
    for path in sorted(resource.iterdir()):
        if not path.is_file() or path.name == '.gitkeep':
            continue
        digest = sha256(path)
        hashes.setdefault(digest, []).append(path.name)
        ext = path.suffix.lower()
        if ext in MODELS:
            item = audit_model(path)
            item['verdict'] = verdict(item)
            models.append(item)
        elif ext in TEXTURES:
            textures.append(audit_texture(path))
        else:
            classification = 'EMPTY-JUNK' if path.stat().st_size == 0 else 'UNSUPPORTED'
            others.append({'source': path.name, 'bytes': path.stat().st_size, 'classification': classification})
    payload = {
        'blenderVersion': bpy.app.version_string,
        'models': models,
        'textures': textures,
        'otherFiles': others,
        'duplicates': [names for names in hashes.values() if len(names) > 1],
    }
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    a.markdown.write_text(render_markdown(payload), encoding='utf-8')
    print(render_markdown(payload))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
