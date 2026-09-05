#!/usr/bin/env python3
from __future__ import annotations

import argparse
import bmesh
import json
import math
from pathlib import Path
import sys
import traceback

import bpy

MAX_RUNTIME_PARTS = 12
MAX_RUNTIME_VERTICES_PER_PART = 4096


def parse_args():
    raw = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--resource', type=Path, required=True)
    p.add_argument('--plan', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--report-json', type=Path, required=True)
    p.add_argument('--report-md', type=Path, required=True)
    return p.parse_args(raw)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load_model(path: Path):
    ext = path.suffix.lower()
    if ext == '.blend':
        bpy.ops.wm.open_mainfile(filepath=str(path.resolve()))
        return
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
        raise RuntimeError(f'unsupported source format: {ext}')


def source_points():
    deps = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or not obj.visible_get():
            continue
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        try:
            for vertex in mesh.vertices:
                point = evaluated.matrix_world @ vertex.co
                points.append((float(point.x), float(point.y), float(point.z)))
        finally:
            evaluated.to_mesh_clear()
    if len(points) < 4:
        raise RuntimeError('source has fewer than four mesh vertices')
    return points


def normalize(points):
    lo = [min(point[i] for point in points) for i in range(3)]
    hi = [max(point[i] for point in points) for i in range(3)]
    dims = [hi[i] - lo[i] for i in range(3)]
    scale = max(dims)
    if not math.isfinite(scale) or scale <= 1e-9:
        raise RuntimeError('source bounds are degenerate')
    center_x = (lo[0] + hi[0]) * 0.5
    center_y = (lo[1] + hi[1]) * 0.5
    normalized = [
        (
            (point[0] - center_x) / scale,
            (point[1] - center_y) / scale,
            (point[2] - lo[2]) / scale,
        )
        for point in points
    ]
    return normalized, [dimension / scale for dimension in dims]


def reduce_points(points, limit=2500):
    if len(points) <= limit:
        return points
    lo = [min(point[i] for point in points) for i in range(3)]
    hi = [max(point[i] for point in points) for i in range(3)]
    span = [max(hi[i] - lo[i], 1e-9) for i in range(3)]
    grid = {}
    resolution = 36
    for point in points:
        key = tuple(
            min(resolution - 1, max(0, int((point[i] - lo[i]) / span[i] * resolution)))
            for i in range(3)
        )
        if key not in grid:
            grid[key] = point
    reduced = list(grid.values())
    extrema = []
    for axis in range(3):
        extrema.append(min(points, key=lambda point: point[axis]))
        extrema.append(max(points, key=lambda point: point[axis]))
    reduced.extend(extrema)
    if len(reduced) > limit:
        step = len(reduced) / limit
        reduced = [reduced[min(len(reduced) - 1, int(index * step))] for index in range(limit)]
        reduced.extend(extrema)
    unique = {}
    for point in reduced:
        unique[tuple(round(value, 7) for value in point)] = point
    return list(unique.values())


def split_points(points, requested_parts):
    if requested_parts <= 1:
        return [points]
    lo = [min(point[i] for point in points) for i in range(3)]
    hi = [max(point[i] for point in points) for i in range(3)]
    dims = [hi[i] - lo[i] for i in range(3)]
    axis = max(range(3), key=lambda index: dims[index])
    span = max(dims[axis], 1e-9)
    overlap = span * 0.025
    buckets = []
    for part in range(requested_parts):
        start = lo[axis] + span * part / requested_parts
        end = lo[axis] + span * (part + 1) / requested_parts
        bucket = [
            point for point in points
            if point[axis] >= start - overlap and point[axis] <= end + overlap
        ]
        if len(bucket) < 4:
            raise RuntimeError(f'partition {part} contains fewer than four vertices')
        buckets.append(bucket)
    return buckets


def create_hull_object(points, index):
    points = reduce_points(points)
    if len(points) > MAX_RUNTIME_VERTICES_PER_PART:
        raise RuntimeError(f'part {index} exceeds runtime vertex budget before hull')
    mesh = bpy.data.meshes.new(f'COLLIDER_{index:02d}_MESH')
    mesh.from_pydata(points, [], [])
    mesh.update()
    obj = bpy.data.objects.new(f'COLLIDER_{index:02d}', mesh)
    bpy.context.scene.collection.objects.link(obj)

    bm = bmesh.new()
    try:
        bm.from_mesh(mesh)
        result = bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
        if not result:
            raise RuntimeError(f'convex hull failed for part {index}')
        used = {vertex for face in bm.faces for vertex in face.verts}
        unused = [vertex for vertex in bm.verts if vertex not in used]
        if unused:
            bmesh.ops.delete(bm, geom=unused, context='VERTS')
        if not bm.faces:
            raise RuntimeError(f'convex hull produced no faces for part {index}')
        bmesh.ops.triangulate(bm, faces=list(bm.faces))
        bm.to_mesh(mesh)
        mesh.update()
    finally:
        bm.free()

    mesh.calc_loop_triangles()
    return obj, len(mesh.vertices), len(mesh.loop_triangles)


def build_entry(resource: Path, output: Path, entry):
    source = resource / entry['source']
    if not source.exists():
        raise FileNotFoundError(source)
    requested_parts = int(entry.get('parts', 1))
    if requested_parts < 1 or requested_parts > MAX_RUNTIME_PARTS:
        raise RuntimeError(f'invalid requested part count: {requested_parts}')

    load_model(source)
    points, normalized_dims = normalize(source_points())
    buckets = split_points(points, requested_parts)

    reset()
    proxy_vertices = 0
    proxy_triangles = 0
    max_part_vertices = 0
    for index, bucket in enumerate(buckets):
        _, vertices, triangles = create_hull_object(bucket, index)
        proxy_vertices += vertices
        proxy_triangles += triangles
        max_part_vertices = max(max_part_vertices, vertices)

    if len(buckets) > MAX_RUNTIME_PARTS:
        raise RuntimeError('runtime part budget exceeded')
    if max_part_vertices > MAX_RUNTIME_VERTICES_PER_PART:
        raise RuntimeError('runtime per-part vertex budget exceeded')

    target_dir = output / entry['id']
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / 'collider.glb'
    bpy.ops.export_scene.gltf(
        filepath=str(target.resolve()),
        export_format='GLB',
        export_apply=True,
    )
    proxy_bytes = target.stat().st_size
    max_triangles = int(entry.get('maxProxyTriangles', 4000))
    max_bytes = int(entry.get('maxProxyBytes', 524288))
    if proxy_triangles > max_triangles:
        raise RuntimeError(f'proxy triangle budget exceeded: {proxy_triangles} > {max_triangles}')
    if proxy_bytes > max_bytes:
        raise RuntimeError(f'proxy byte budget exceeded: {proxy_bytes} > {max_bytes}')

    return {
        'id': entry['id'],
        'source': entry['source'],
        'strategy': entry['strategy'],
        'geometrySource': 'proxy',
        'proxyPath': f"/assets/accessories/{entry['id']}/collider.glb",
        'requestedParts': requested_parts,
        'actualParts': len(buckets),
        'proxyVertices': proxy_vertices,
        'proxyTriangles': proxy_triangles,
        'maxPartVertices': max_part_vertices,
        'proxyBytes': proxy_bytes,
        'normalizedDimensions': [round(value, 6) for value in normalized_dims],
        'status': 'ok',
    }


def markdown(results):
    lines = [
        '# V2-03 collider proxy build',
        '',
        '| ID | Source | Stratégie | Parts | Vertices | Triangles | Poids | Statut |',
        '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
    ]
    for item in results:
        if item['status'] == 'ok':
            lines.append(
                f"| `{item['id']}` | `{item['source']}` | {item['strategy']} / proxy | "
                f"{item['actualParts']} | {item['proxyVertices']} | {item['proxyTriangles']} | "
                f"{item['proxyBytes'] / 1024:.1f} KiB | OK |"
            )
        else:
            lines.append(
                f"| `{item.get('id', '?')}` | `{item.get('source', '?')}` | "
                f"{item.get('strategy', '?')} | - | - | - | - | **ERROR** |"
            )
    lines.extend([
        '',
        f'Garde-fous runtime : <= {MAX_RUNTIME_PARTS} convex parts, '
        f'<= {MAX_RUNTIME_VERTICES_PER_PART} vertices par part.',
        '',
    ])
    failures = [item for item in results if item['status'] != 'ok']
    if failures:
        lines.append('## Erreurs')
        lines.append('')
        for item in failures:
            lines.append(f"- `{item.get('id', '?')}` : {item.get('error', 'unknown error')}")
    return '\n'.join(lines) + '\n'


def main():
    cfg = parse_args()
    plan = json.loads(cfg.plan.read_text(encoding='utf-8'))
    cfg.output.mkdir(parents=True, exist_ok=True)
    cfg.report_json.parent.mkdir(parents=True, exist_ok=True)
    results = []
    for entry in plan['accessories']:
        try:
            results.append(build_entry(cfg.resource, cfg.output, entry))
        except Exception as exc:
            results.append({
                'id': entry.get('id'),
                'source': entry.get('source'),
                'strategy': entry.get('strategy'),
                'status': 'error',
                'error': f'{type(exc).__name__}: {exc}',
                'traceback': traceback.format_exc(limit=8),
            })
    cfg.report_json.write_text(json.dumps({'results': results}, indent=2), encoding='utf-8')
    cfg.report_md.write_text(markdown(results), encoding='utf-8')
    if any(item['status'] != 'ok' for item in results):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
