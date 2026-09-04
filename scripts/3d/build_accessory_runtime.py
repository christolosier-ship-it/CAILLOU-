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


def parse_args():
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


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load_model(path: Path):
    ext = path.suffix.lower()
    if ext == '.blend':
        bpy.ops.wm.open_mainfile(filepath=str(path.resolve()))
        return
    reset()
    filepath = str(path.resolve())
    if ext in {'.glb', '.gltf'}:
        bpy.ops.import_scene.gltf(filepath=filepath)
    elif ext == '.fbx':
        if hasattr(bpy.ops.wm, 'fbx_import'):
            bpy.ops.wm.fbx_import(filepath=filepath)
        else:
            bpy.ops.import_scene.fbx(filepath=filepath)
    elif ext == '.obj':
        if hasattr(bpy.ops.wm, 'obj_import'):
            bpy.ops.wm.obj_import(filepath=filepath)
        else:
            bpy.ops.import_scene.obj(filepath=filepath)
    else:
        raise RuntimeError(f'unsupported source format: {ext}')


def visible_meshes():
    return [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.visible_get()]


def relink_images(resource: Path):
    relinked = []
    for image in bpy.data.images:
        if image.source != 'FILE':
            continue
        candidates = []
        if image.filepath:
            try:
                candidates.append(Path(bpy.path.abspath(image.filepath)).name)
            except Exception:
                pass
            candidates.append(Path(image.filepath).name)
        candidates.append(Path(image.name).name)
        for basename in candidates:
            candidate = resource / basename
            if not basename or not candidate.exists():
                continue
            image.filepath = str(candidate.resolve())
            try:
                image.reload()
            except Exception:
                pass
            relinked.append(basename)
            break
    return sorted(set(relinked))


def bake_scene_meshes():
    source = visible_meshes()
    if not source:
        raise RuntimeError('source contains no visible mesh')
    depsgraph = bpy.context.evaluated_depsgraph_get()
    baked = []
    for index, obj in enumerate(source):
        evaluated = obj.evaluated_get(depsgraph)
        materials = list(obj.data.materials) if getattr(obj, 'data', None) else []
        mesh = bpy.data.meshes.new_from_object(
            evaluated,
            preserve_all_data_layers=True,
            depsgraph=depsgraph,
        )
        if len(mesh.materials) == 0:
            for material in materials:
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


def triangle_count(meshes):
    total = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        total += len(obj.data.loop_triangles)
    return total


def apply_decimate(obj, ratio):
    if ratio >= 0.999:
        return
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new(name='V2_03_DECIMATE', type='DECIMATE')
    modifier.decimate_type = 'COLLAPSE'
    modifier.ratio = max(0.01, min(1.0, ratio))
    if hasattr(modifier, 'use_collapse_triangulate'):
        modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def decimate_to_target(meshes, target):
    before = triangle_count(meshes)
    if before <= target:
        return before, before
    ratio = max(0.01, min(1.0, target / before))
    for obj in meshes:
        apply_decimate(obj, ratio)
    after = triangle_count(meshes)
    if after > int(target * 1.08):
        second_ratio = max(0.01, min(1.0, target / after * 0.98))
        for obj in meshes:
            apply_decimate(obj, second_ratio)
        after = triangle_count(meshes)
    return before, after


def normalize_meshes(meshes):
    points = [vertex.co for obj in meshes for vertex in obj.data.vertices]
    if len(points) < 4:
        raise RuntimeError('render source has fewer than four vertices')
    lo = [min(float(point[i]) for point in points) for i in range(3)]
    hi = [max(float(point[i]) for point in points) for i in range(3)]
    dims = [hi[i] - lo[i] for i in range(3)]
    scale = max(dims)
    if not math.isfinite(scale) or scale <= 1e-9:
        raise RuntimeError('render source bounds are degenerate')
    center_x = (lo[0] + hi[0]) * 0.5
    center_y = (lo[1] + hi[1]) * 0.5
    for obj in meshes:
        for vertex in obj.data.vertices:
            vertex.co.x = (vertex.co.x - center_x) / scale
            vertex.co.y = (vertex.co.y - center_y) / scale
            vertex.co.z = (vertex.co.z - lo[2]) / scale
        obj.data.update()
    return [dimension / scale for dimension in dims]


def create_material(name, color, roughness=0.55, metallic=0.0):
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    bsdf = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
    return material


def ensure_fallback_material(meshes, entry):
    has_material = any(any(slot for slot in obj.data.materials) for obj in meshes)
    if has_material or entry.get('materialPreset') == 'traffic-cone':
        return
    color = entry.get('fallbackBaseColor', [0.48, 0.43, 0.38, 1.0])
    roughness = float(entry.get('fallbackRoughness', 0.58))
    material = create_material(f"{entry['id']}_fallback", color, roughness)
    for obj in meshes:
        if len(obj.data.materials) == 0:
            obj.data.materials.append(material)


def apply_traffic_cone_material(meshes):
    dark = create_material('traffic_cone_dark_rubber', [0.035, 0.04, 0.045, 1.0], 0.78)
    orange = create_material('traffic_cone_orange', [0.92, 0.18, 0.025, 1.0], 0.42)
    white = create_material('traffic_cone_reflective', [0.82, 0.84, 0.82, 1.0], 0.34, 0.05)
    for obj in meshes:
        obj.data.materials.clear()
        obj.data.materials.append(dark)
        obj.data.materials.append(orange)
        obj.data.materials.append(white)
        for polygon in obj.data.polygons:
            if not polygon.vertices:
                continue
            z = sum(float(obj.data.vertices[index].co.z) for index in polygon.vertices) / len(polygon.vertices)
            if z < 0.18:
                polygon.material_index = 0
            elif 0.47 <= z <= 0.61:
                polygon.material_index = 2
            else:
                polygon.material_index = 1


def first_material(meshes):
    for obj in meshes:
        for material in obj.data.materials:
            if material:
                return material
    material = create_material('V2_03_default', [0.48, 0.43, 0.38, 1.0])
    meshes[0].data.materials.append(material)
    return material


def load_override_image(resource: Path, filename: str, non_color=False):
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


def apply_texture_overrides(meshes, entry, resource: Path):
    keys = ['baseColorTexture', 'normalTexture', 'roughnessTexture', 'metallicTexture']
    if not any(entry.get(key) for key in keys):
        return
    material = first_material(meshes)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = next((node for node in nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf:
        bsdf = nodes.new('ShaderNodeBsdfPrincipled')

    if entry.get('baseColorTexture'):
        image = load_override_image(resource, entry['baseColorTexture'])
        node = nodes.new('ShaderNodeTexImage')
        node.image = image
        links.new(node.outputs['Color'], bsdf.inputs['Base Color'])

    if entry.get('normalTexture'):
        image = load_override_image(resource, entry['normalTexture'], non_color=True)
        node = nodes.new('ShaderNodeTexImage')
        node.image = image
        normal = nodes.new('ShaderNodeNormalMap')
        links.new(node.outputs['Color'], normal.inputs['Color'])
        links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])

    if entry.get('roughnessTexture'):
        image = load_override_image(resource, entry['roughnessTexture'], non_color=True)
        node = nodes.new('ShaderNodeTexImage')
        node.image = image
        links.new(node.outputs['Color'], bsdf.inputs['Roughness'])

    if entry.get('metallicTexture'):
        image = load_override_image(resource, entry['metallicTexture'], non_color=True)
        node = nodes.new('ShaderNodeTexImage')
        node.image = image
        links.new(node.outputs['Color'], bsdf.inputs['Metallic'])


def used_images(meshes):
    result = []
    seen = set()
    for obj in meshes:
        for material in obj.data.materials:
            if not material or not material.use_nodes:
                continue
            for node in material.node_tree.nodes:
                image = getattr(node, 'image', None)
                if node.type != 'TEX_IMAGE' or image is None:
                    continue
                if image.name in seen:
                    continue
                seen.add(image.name)
                result.append(image)
    return result


def resize_images(meshes, max_dimension):
    report = []
    for image in used_images(meshes):
        width, height = int(image.size[0]), int(image.size[1])
        if width <= 0 or height <= 0:
            continue
        original = [width, height]
        largest = max(width, height)
        if largest > max_dimension:
            ratio = max_dimension / largest
            width = max(1, int(round(width * ratio)))
            height = max(1, int(round(height * ratio)))
            image.scale(width, height)
            try:
                image.pack()
            except Exception:
                pass
        report.append({
            'name': image.name,
            'original': original,
            'runtime': [int(image.size[0]), int(image.size[1])],
        })
    return report


def parse_glb(path: Path):
    raw = path.read_bytes()
    if len(raw) < 20 or raw[:4] != b'glTF':
        raise RuntimeError(f'{path.name} is not a GLB file')
    _, version, total_length = struct.unpack_from('<4sII', raw, 0)
    if version != 2 or total_length != len(raw):
        raise RuntimeError(f'{path.name} has an invalid GLB header')
    offset = 12
    document = None
    while offset + 8 <= len(raw):
        chunk_length, chunk_type = struct.unpack_from('<II', raw, offset)
        offset += 8
        chunk = raw[offset:offset + chunk_length]
        offset += chunk_length
        if chunk_type == 0x4E4F534A:
            document = json.loads(chunk.rstrip(b'\x00 \t\r\n').decode('utf-8'))
            break
    if document is None:
        raise RuntimeError(f'{path.name} contains no JSON chunk')
    external = 0
    for buffer in document.get('buffers', []):
        if buffer.get('uri'):
            external += 1
    image_lengths = []
    buffer_views = document.get('bufferViews', [])
    for image in document.get('images', []):
        if image.get('uri'):
            external += 1
        view_index = image.get('bufferView')
        if isinstance(view_index, int) and 0 <= view_index < len(buffer_views):
            image_lengths.append(int(buffer_views[view_index].get('byteLength', 0)))
    return {
        'externalDependencies': external,
        'embeddedImages': len(image_lengths),
        'largestTextureBytes': max(image_lengths, default=0),
    }


def render_preview(meshes, path: Path, size: int):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x = size
    scene.render.resolution_y = size
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

    zmax = max(float(vertex.co.z) for obj in meshes for vertex in obj.data.vertices)
    target = Vector((0.0, 0.0, zmax * 0.5))
    direction = target - camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera

    def add_area(name, location, energy, size_value):
        data = bpy.data.lights.new(name=name, type='AREA')
        data.energy = energy
        data.shape = 'DISK'
        data.size = size_value
        light = bpy.data.objects.new(name, data)
        light.location = Vector(location)
        light.rotation_euler = (target - light.location).to_track_quat('-Z', 'Y').to_euler()
        scene.collection.objects.link(light)

    add_area('KEY', (2.2, -2.4, 3.1), 650, 4.0)
    add_area('FILL', (-2.0, -1.0, 1.8), 320, 3.0)
    add_area('RIM', (0.4, 2.0, 2.6), 480, 3.2)
    scene.world.color = (0.055, 0.055, 0.055)
    bpy.ops.render.render(write_still=True)


def build_entry(resource, defaults, entry, collider_output, collider_by_id, output, previews):
    source = resource / entry['source']
    if not source.exists():
        raise FileNotFoundError(source)
    load_model(source)
    relinked = relink_images(resource)
    meshes = bake_scene_meshes()
    ensure_fallback_material(meshes, entry)
    apply_texture_overrides(meshes, entry, resource)

    target_triangles = int(entry['targetTriangles'])
    source_triangles, runtime_triangles = decimate_to_target(meshes, target_triangles)
    normalized_dims = normalize_meshes(meshes)
    if entry.get('materialPreset') == 'traffic-cone':
        apply_traffic_cone_material(meshes)

    max_texture_dimension = int(entry.get('maxTextureDimension', defaults['maxTextureDimension']))
    image_report = resize_images(meshes, max_texture_dimension)
    actual_max_texture_dimension = max(
        (max(item['runtime']) for item in image_report),
        default=0,
    )

    collider = collider_by_id.get(entry['id'])
    if not collider or collider.get('status') != 'ok':
        raise RuntimeError('missing successful collider report')
    collider_dims = collider.get('normalizedDimensions')
    if not isinstance(collider_dims, list) or len(collider_dims) != 3:
        raise RuntimeError('collider normalized dimensions missing')
    for index in range(3):
        if abs(float(collider_dims[index]) - normalized_dims[index]) > 1e-5:
            raise RuntimeError(
                f"normalization drift on axis {index}: render={normalized_dims[index]:.6f}, collider={float(collider_dims[index]):.6f}"
            )

    target_dir = output / entry['id']
    target_dir.mkdir(parents=True, exist_ok=True)
    model_path = target_dir / 'model.glb'
    bpy.ops.export_scene.gltf(
        filepath=str(model_path.resolve()),
        export_format='GLB',
        export_apply=True,
        export_animations=False,
    )
    model_bytes = model_path.stat().st_size
    max_model_bytes = int(entry.get('maxModelBytes', defaults['maxModelBytes']))
    if model_bytes > max_model_bytes:
        raise RuntimeError(f'model byte budget exceeded: {model_bytes} > {max_model_bytes}')

    glb = parse_glb(model_path)
    if glb['externalDependencies'] != 0:
        raise RuntimeError(f"model has {glb['externalDependencies']} external dependencies")

    collider_source = collider_output / entry['id'] / 'collider.glb'
    if not collider_source.exists():
        raise FileNotFoundError(collider_source)
    collider_target = target_dir / 'collider.glb'
    shutil.copy2(collider_source, collider_target)

    previews.mkdir(parents=True, exist_ok=True)
    preview_path = previews / f"{entry['id']}.png"
    render_preview(meshes, preview_path, int(defaults['previewSize']))
    preview_bytes = preview_path.stat().st_size
    max_preview_bytes = int(entry.get('maxPreviewBytes', defaults['maxPreviewBytes']))
    if preview_bytes <= 0 or preview_bytes > max_preview_bytes:
        raise RuntimeError(f'preview byte budget exceeded: {preview_bytes} > {max_preview_bytes}')

    budget = {'runtimeModelBytes': model_bytes}
    if actual_max_texture_dimension > 0:
        budget['maxTextureDimension'] = actual_max_texture_dimension
    if glb['largestTextureBytes'] > 0:
        budget['largestTextureBytes'] = glb['largestTextureBytes']

    return {
        'id': entry['id'],
        'source': entry['source'],
        'sourceTriangles': source_triangles,
        'triangleCount': runtime_triangles,
        'targetTriangles': target_triangles,
        'dimensions': [round(value, 6) for value in normalized_dims],
        'modelPath': f"/assets/accessories/{entry['id']}/model.glb",
        'previewPath': f"/assets/accessory-previews/{entry['id']}.png",
        'collision': {
            'strategy': collider['strategy'],
            'geometrySource': 'proxy',
            'proxyPath': f"/assets/accessories/{entry['id']}/collider.glb",
        },
        'budget': budget,
        'modelBytes': model_bytes,
        'colliderBytes': collider_target.stat().st_size,
        'previewBytes': preview_bytes,
        'embeddedImages': glb['embeddedImages'],
        'externalDependencies': glb['externalDependencies'],
        'images': image_report,
        'relinkedImages': relinked,
        'status': 'ok',
    }


def markdown(results):
    lines = [
        '# V2-03 runtime asset build',
        '',
        '| ID | Source tris | Runtime tris | Model | Collider | Preview | Texture max | Statut |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ]
    for item in results:
        if item['status'] == 'ok':
            texture_max = item['budget'].get('maxTextureDimension', 0)
            lines.append(
                f"| `{item['id']}` | {item['sourceTriangles']} | {item['triangleCount']} | "
                f"{item['modelBytes'] / 1024:.1f} KiB | {item['colliderBytes'] / 1024:.1f} KiB | "
                f"{item['previewBytes'] / 1024:.1f} KiB | {texture_max or '-'} | OK |"
            )
        else:
            lines.append(
                f"| `{item.get('id', '?')}` | - | - | - | - | - | - | **ERROR** |"
            )
    failures = [item for item in results if item['status'] != 'ok']
    lines.extend(['', 'Normalisation: centre X/Y, base Z=0, dimension maximale=1.', ''])
    if failures:
        lines.extend(['## Erreurs', ''])
        for item in failures:
            lines.append(f"- `{item.get('id', '?')}` : {item.get('error', 'unknown error')}")
    return '\n'.join(lines) + '\n'


def main():
    cfg = parse_args()
    plan = json.loads(cfg.plan.read_text(encoding='utf-8'))
    collider_report = json.loads(cfg.collider_report_json.read_text(encoding='utf-8'))
    collider_by_id = {item['id']: item for item in collider_report['results']}
    defaults = plan['defaults']
    cfg.output.mkdir(parents=True, exist_ok=True)
    cfg.previews.mkdir(parents=True, exist_ok=True)
    cfg.report_json.parent.mkdir(parents=True, exist_ok=True)
    results = []
    for entry in plan['accessories']:
        try:
            results.append(build_entry(
                cfg.resource,
                defaults,
                entry,
                cfg.collider_output,
                collider_by_id,
                cfg.output,
                cfg.previews,
            ))
        except Exception as exc:
            results.append({
                'id': entry.get('id'),
                'source': entry.get('source'),
                'status': 'error',
                'error': f'{type(exc).__name__}: {exc}',
                'traceback': traceback.format_exc(limit=10),
            })
    cfg.report_json.write_text(json.dumps({'results': results}, indent=2), encoding='utf-8')
    cfg.report_md.write_text(markdown(results), encoding='utf-8')
    if any(item['status'] != 'ok' for item in results):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
