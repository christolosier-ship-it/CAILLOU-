#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import shutil
import struct
import sys
import traceback

import bpy
from mathutils import Matrix, Vector


def args():
    raw = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--resource', type=Path, required=True)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--collider-output', type=Path, required=True)
    parser.add_argument('--collider-report-json', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--previews', type=Path, required=True)
    parser.add_argument('--report-json', type=Path, required=True)
    parser.add_argument('--report-md', type=Path, required=True)
    return parser.parse_args(raw)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_source(path: Path):
    ext = path.suffix.lower()
    if ext == '.blend':
        bpy.ops.wm.open_mainfile(filepath=str(path.resolve()))
        return
    reset_scene()
    filepath = str(path.resolve())
    if ext in {'.glb', '.gltf'}:
        bpy.ops.import_scene.gltf(filepath=filepath)
    elif ext == '.fbx':
        (bpy.ops.wm.fbx_import if hasattr(bpy.ops.wm, 'fbx_import') else bpy.ops.import_scene.fbx)(filepath=filepath)
    elif ext == '.obj':
        (bpy.ops.wm.obj_import if hasattr(bpy.ops.wm, 'obj_import') else bpy.ops.import_scene.obj)(filepath=filepath)
    else:
        raise RuntimeError(f'unsupported source format: {ext}')


def meshes():
    return [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.visible_get()]


def relink_images(resource: Path):
    names = []
    for image in bpy.data.images:
        if image.source != 'FILE':
            continue
        candidates = [Path(image.filepath).name, Path(image.name).name]
        try:
            candidates.insert(0, Path(bpy.path.abspath(image.filepath)).name)
        except Exception:
            pass
        for basename in candidates:
            candidate = resource / basename
            if basename and candidate.exists():
                image.filepath = str(candidate.resolve())
                try:
                    image.reload()
                except Exception:
                    pass
                names.append(basename)
                break
    return sorted(set(names))


def bake_world_space():
    source = meshes()
    if not source:
        raise RuntimeError('source contains no visible mesh')
    depsgraph = bpy.context.evaluated_depsgraph_get()
    baked = []
    for index, obj in enumerate(source):
        evaluated = obj.evaluated_get(depsgraph)
        original_materials = list(obj.data.materials) if getattr(obj, 'data', None) else []
        mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
        if not mesh.materials:
            for material in original_materials:
                if material:
                    mesh.materials.append(material)
        target = bpy.data.objects.new(f'RENDER_{index:02d}', mesh)
        target.matrix_world = obj.matrix_world.copy()
        bpy.context.scene.collection.objects.link(target)
        baked.append(target)
    for obj in list(bpy.context.scene.objects):
        if obj not in baked:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in baked:
        obj.data.transform(obj.matrix_world)
        obj.matrix_world = Matrix.Identity(4)
        obj.data.update()
    return baked


def triangle_count(items):
    total = 0
    for obj in items:
        obj.data.calc_loop_triangles()
        total += len(obj.data.loop_triangles)
    return total


def normalize(items):
    points = [vertex.co for obj in items for vertex in obj.data.vertices]
    if len(points) < 4:
        raise RuntimeError('render source has fewer than four vertices')
    lo = [min(float(point[i]) for point in points) for i in range(3)]
    hi = [max(float(point[i]) for point in points) for i in range(3)]
    dimensions = [hi[i] - lo[i] for i in range(3)]
    scale = max(dimensions)
    if not math.isfinite(scale) or scale <= 1e-9:
        raise RuntimeError('render source bounds are degenerate')
    cx = (lo[0] + hi[0]) * 0.5
    cy = (lo[1] + hi[1]) * 0.5
    for obj in items:
        for vertex in obj.data.vertices:
            vertex.co.x = (vertex.co.x - cx) / scale
            vertex.co.y = (vertex.co.y - cy) / scale
            vertex.co.z = (vertex.co.z - lo[2]) / scale
        obj.data.update()
    return [dimension / scale for dimension in dimensions]


def decimate(items, target):
    before = triangle_count(items)
    if before <= target:
        return before
    ratio = max(0.01, min(1.0, target / before))
    for obj in items:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new(name='V2_03_DECIMATE', type='DECIMATE')
        modifier.decimate_type = 'COLLAPSE'
        modifier.ratio = ratio
        if hasattr(modifier, 'use_collapse_triangulate'):
            modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    after = triangle_count(items)
    if after > int(target * 1.08):
        ratio2 = max(0.01, min(1.0, target / after * 0.98))
        for obj in items:
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new(name='V2_03_DECIMATE_2', type='DECIMATE')
            modifier.decimate_type = 'COLLAPSE'
            modifier.ratio = ratio2
            if hasattr(modifier, 'use_collapse_triangulate'):
                modifier.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    return triangle_count(items)


def material(name, color, roughness=0.55, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = next((node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
    return mat


def ensure_material(items, entry):
    if entry.get('materialPreset') == 'traffic-cone':
        return
    if any(any(slot for slot in obj.data.materials) for obj in items):
        return
    mat = material(
        f"{entry['id']}_fallback",
        entry.get('fallbackBaseColor', [0.48, 0.43, 0.38, 1.0]),
        float(entry.get('fallbackRoughness', 0.58)),
    )
    for obj in items:
        if not obj.data.materials:
            obj.data.materials.append(mat)


def traffic_cone_material(items):
    dark = material('traffic_cone_dark_rubber', [0.035, 0.04, 0.045, 1.0], 0.78)
    orange = material('traffic_cone_orange', [0.92, 0.18, 0.025, 1.0], 0.42)
    white = material('traffic_cone_reflective', [0.82, 0.84, 0.82, 1.0], 0.34, 0.05)
    for obj in items:
        obj.data.materials.clear()
        obj.data.materials.append(dark)
        obj.data.materials.append(orange)
        obj.data.materials.append(white)
        for polygon in obj.data.polygons:
            z = sum(float(obj.data.vertices[i].co.z) for i in polygon.vertices) / max(1, len(polygon.vertices))
            polygon.material_index = 0 if z < 0.18 else 2 if 0.47 <= z <= 0.61 else 1


def primary_material(items):
    for obj in items:
        for mat in obj.data.materials:
            if mat:
                return mat
    mat = material('V2_03_default', [0.48, 0.43, 0.38, 1.0])
    items[0].data.materials.append(mat)
    return mat


def override_image(resource: Path, filename: str, non_color=False):
    path = resource / filename
    if not path.exists():
        raise FileNotFoundError(path)
    image = bpy.data.images.load(str(path.resolve()), check_existing=True)
    if non_color:
        try:
            image.colorspace_settings.name = 'Non-Color'
        except Exception:
            pass
    return image


def texture_overrides(items, entry, resource):
    keys = ('baseColorTexture', 'normalTexture', 'roughnessTexture', 'metallicTexture')
    if not any(entry.get(key) for key in keys):
        return
    mat = primary_material(items)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next((node for node in nodes if node.type == 'BSDF_PRINCIPLED'), None) or nodes.new('ShaderNodeBsdfPrincipled')
    mapping = [
        ('baseColorTexture', 'Base Color', False, None),
        ('roughnessTexture', 'Roughness', True, None),
        ('metallicTexture', 'Metallic', True, None),
    ]
    for key, target, non_color, _ in mapping:
        if not entry.get(key):
            continue
        node = nodes.new('ShaderNodeTexImage')
        node.image = override_image(resource, entry[key], non_color)
        links.new(node.outputs['Color'], bsdf.inputs[target])
    if entry.get('normalTexture'):
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = override_image(resource, entry['normalTexture'], True)
        normal = nodes.new('ShaderNodeNormalMap')
        links.new(tex.outputs['Color'], normal.inputs['Color'])
        links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])


def used_images(items):
    found, seen = [], set()
    for obj in items:
        for mat in obj.data.materials:
            if not mat or not mat.use_nodes:
                continue
            for node in mat.node_tree.nodes:
                image = getattr(node, 'image', None)
                if node.type == 'TEX_IMAGE' and image is not None and image.name not in seen:
                    seen.add(image.name)
                    found.append(image)
    return found


def resize_images(items, maximum):
    report = []
    for image in used_images(items):
        width, height = int(image.size[0]), int(image.size[1])
        if width <= 0 or height <= 0:
            continue
        original = [width, height]
        largest = max(width, height)
        if largest > maximum:
            factor = maximum / largest
            image.scale(max(1, round(width * factor)), max(1, round(height * factor)))
            try:
                image.pack()
            except Exception:
                pass
        report.append({'name': image.name, 'original': original, 'runtime': [int(image.size[0]), int(image.size[1])]})
    return report


def glb_info(path: Path):
    raw = path.read_bytes()
    if len(raw) < 20 or raw[:4] != b'glTF':
        raise RuntimeError(f'{path.name} is not a GLB file')
    _, version, total = struct.unpack_from('<4sII', raw, 0)
    if version != 2 or total != len(raw):
        raise RuntimeError(f'{path.name} has an invalid GLB header')
    offset, document = 12, None
    while offset + 8 <= len(raw):
        length, kind = struct.unpack_from('<II', raw, offset)
        offset += 8
        chunk = raw[offset:offset + length]
        offset += length
        if kind == 0x4E4F534A:
            document = json.loads(chunk.rstrip(b'\x00 \t\r\n').decode('utf-8'))
            break
    if document is None:
        raise RuntimeError(f'{path.name} contains no JSON chunk')
    external = sum(1 for buffer in document.get('buffers', []) if buffer.get('uri'))
    views = document.get('bufferViews', [])
    image_bytes = []
    for image in document.get('images', []):
        if image.get('uri'):
            external += 1
        view = image.get('bufferView')
        if isinstance(view, int) and 0 <= view < len(views):
            image_bytes.append(int(views[view].get('byteLength', 0)))
    return {'externalDependencies': external, 'embeddedImages': len(image_bytes), 'largestTextureBytes': max(image_bytes, default=0)}


def preview(items, path: Path, size: int):
    scene = bpy.context.scene
    if scene.world is None:
        scene.world = bpy.data.worlds.new('V2_03_PREVIEW_WORLD')
    scene.world.color = (0.055, 0.055, 0.055)
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.film_transparent = True
    scene.render.filepath = str(path.resolve())
    camera_data = bpy.data.cameras.new('PREVIEW_CAMERA')
    camera = bpy.data.objects.new('PREVIEW_CAMERA', camera_data)
    scene.collection.objects.link(camera)
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 1.42
    camera.location = Vector((1.5, -1.8, 1.35))
    zmax = max(float(vertex.co.z) for obj in items for vertex in obj.data.vertices)
    target = Vector((0.0, 0.0, zmax * 0.5))
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    for name, location, energy, lamp_size in [
        ('KEY', (2.2, -2.4, 3.1), 650, 4.0),
        ('FILL', (-2.0, -1.0, 1.8), 320, 3.0),
        ('RIM', (0.4, 2.0, 2.6), 480, 3.2),
    ]:
        data = bpy.data.lights.new(name=name, type='AREA')
        data.energy, data.shape, data.size = energy, 'DISK', lamp_size
        lamp = bpy.data.objects.new(name, data)
        lamp.location = Vector(location)
        lamp.rotation_euler = (target - lamp.location).to_track_quat('-Z', 'Y').to_euler()
        scene.collection.objects.link(lamp)
    bpy.ops.render.render(write_still=True)


def build(resource, defaults, entry, collider_root, collider_by_id, output, previews):
    source = resource / entry['source']
    if not source.exists():
        raise FileNotFoundError(source)
    import_source(source)
    relinked = relink_images(resource)
    items = bake_world_space()
    ensure_material(items, entry)
    texture_overrides(items, entry, resource)

    source_triangles = triangle_count(items)
    normalized_dimensions = normalize(items)
    runtime_triangles = decimate(items, int(entry['targetTriangles']))
    if entry.get('materialPreset') == 'traffic-cone':
        traffic_cone_material(items)

    collider = collider_by_id.get(entry['id'])
    if not collider or collider.get('status') != 'ok':
        raise RuntimeError('missing successful collider report')
    collider_dimensions = collider.get('normalizedDimensions')
    if not isinstance(collider_dimensions, list) or len(collider_dimensions) != 3:
        raise RuntimeError('collider normalized dimensions missing')
    for axis in range(3):
        if abs(float(collider_dimensions[axis]) - normalized_dimensions[axis]) > 1e-5:
            raise RuntimeError(
                f"source normalization drift axis {axis}: render={normalized_dimensions[axis]:.6f}, collider={float(collider_dimensions[axis]):.6f}"
            )

    maximum_texture = int(entry.get('maxTextureDimension', defaults['maxTextureDimension']))
    image_report = resize_images(items, maximum_texture)
    measured_texture_dimension = max((max(item['runtime']) for item in image_report), default=0)

    target_dir = output / entry['id']
    target_dir.mkdir(parents=True, exist_ok=True)
    model_path = target_dir / 'model.glb'
    bpy.ops.export_scene.gltf(filepath=str(model_path.resolve()), export_format='GLB', export_apply=True, export_animations=False)
    model_bytes = model_path.stat().st_size
    max_model = int(entry.get('maxModelBytes', defaults['maxModelBytes']))
    if model_bytes > max_model:
        raise RuntimeError(f'model byte budget exceeded: {model_bytes} > {max_model}')
    info = glb_info(model_path)
    if info['externalDependencies']:
        raise RuntimeError(f"model has {info['externalDependencies']} external dependencies")

    collider_source = collider_root / entry['id'] / 'collider.glb'
    if not collider_source.exists():
        raise FileNotFoundError(collider_source)
    collider_target = target_dir / 'collider.glb'
    shutil.copy2(collider_source, collider_target)

    previews.mkdir(parents=True, exist_ok=True)
    preview_path = previews / f"{entry['id']}.png"
    preview(items, preview_path, int(defaults['previewSize']))
    preview_bytes = preview_path.stat().st_size
    max_preview = int(entry.get('maxPreviewBytes', defaults['maxPreviewBytes']))
    if preview_bytes <= 0 or preview_bytes > max_preview:
        raise RuntimeError(f'preview byte budget exceeded: {preview_bytes} > {max_preview}')

    budget = {'runtimeModelBytes': model_bytes}
    if measured_texture_dimension:
        budget['maxTextureDimension'] = measured_texture_dimension
    if info['largestTextureBytes']:
        budget['largestTextureBytes'] = info['largestTextureBytes']
    return {
        'id': entry['id'],
        'source': entry['source'],
        'sourceTriangles': source_triangles,
        'triangleCount': runtime_triangles,
        'targetTriangles': int(entry['targetTriangles']),
        'dimensions': [round(float(value), 6) for value in collider_dimensions],
        'modelPath': f"/assets/accessories/{entry['id']}/model.glb",
        'previewPath': f"/assets/accessory-previews/{entry['id']}.png",
        'collision': {'strategy': collider['strategy'], 'geometrySource': 'proxy', 'proxyPath': f"/assets/accessories/{entry['id']}/collider.glb"},
        'budget': budget,
        'modelBytes': model_bytes,
        'colliderBytes': collider_target.stat().st_size,
        'previewBytes': preview_bytes,
        'embeddedImages': info['embeddedImages'],
        'externalDependencies': info['externalDependencies'],
        'images': image_report,
        'relinkedImages': relinked,
        'status': 'ok',
    }


def report_markdown(results):
    lines = [
        '# V2-03 runtime asset build', '',
        '| ID | Source tris | Runtime tris | Model | Collider | Preview | Texture max | Statut |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ]
    for item in results:
        if item['status'] == 'ok':
            lines.append(
                f"| `{item['id']}` | {item['sourceTriangles']} | {item['triangleCount']} | {item['modelBytes']/1024:.1f} KiB | "
                f"{item['colliderBytes']/1024:.1f} KiB | {item['previewBytes']/1024:.1f} KiB | {item['budget'].get('maxTextureDimension', '-')} | OK |"
            )
        else:
            lines.append(f"| `{item.get('id','?')}` | - | - | - | - | - | - | **ERROR** |")
    failures = [item for item in results if item['status'] != 'ok']
    lines.extend(['', 'Normalisation source commune : centre X/Y, base Z=0, dimension maximale=1.', ''])
    if failures:
        lines.extend(['## Erreurs', ''])
        for item in failures:
            lines.append(f"- `{item.get('id','?')}` : {item.get('error','unknown error')}")
    return '\n'.join(lines) + '\n'


def main():
    cfg = args()
    plan = json.loads(cfg.plan.read_text(encoding='utf-8'))
    collider_report = json.loads(cfg.collider_report_json.read_text(encoding='utf-8'))
    collider_by_id = {item['id']: item for item in collider_report['results']}
    cfg.output.mkdir(parents=True, exist_ok=True)
    cfg.previews.mkdir(parents=True, exist_ok=True)
    cfg.report_json.parent.mkdir(parents=True, exist_ok=True)
    results = []
    for entry in plan['accessories']:
        try:
            results.append(build(cfg.resource, plan['defaults'], entry, cfg.collider_output, collider_by_id, cfg.output, cfg.previews))
        except Exception as exc:
            results.append({
                'id': entry.get('id'), 'source': entry.get('source'), 'status': 'error',
                'error': f'{type(exc).__name__}: {exc}', 'traceback': traceback.format_exc(limit=10),
            })
    cfg.report_json.write_text(json.dumps({'results': results}, indent=2), encoding='utf-8')
    cfg.report_md.write_text(report_markdown(results), encoding='utf-8')
    if any(item['status'] != 'ok' for item in results):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
