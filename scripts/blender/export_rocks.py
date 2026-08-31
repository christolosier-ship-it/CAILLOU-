import argparse
import json
import math
import os
import re
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

BLENDER_PRODUCTION_VERSION = "4.5.13"
SOURCE_AUTHOR = "Loïc Norgeot"
SOURCE_TITLE = "Rocks - Pack 5"
SOURCE_URL = "https://sketchfab.com/3d-models/rocks-pack-5-3b55666b3b8e41a3a72d94a1d5a76072"
SOURCE_LICENSE = "CC BY 4.0"
SOURCE_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/"
TARGET_MAX_DIMENSION = 2.0
ROUGHNESS = 0.84
NORMAL_STRENGTH = 0.65
MAX_GLB_BYTES = 5 * 1024 * 1024


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser(description="Export deterministic CAILLOU™ production GLBs")
    parser.add_argument("--mode", choices=("slice", "all"), default="slice")
    parser.add_argument("--output-root", default="public/assets/rocks")
    parser.add_argument("--preview-root", default="public/assets/rock-previews")
    parser.add_argument("--report", default="build/rock-production/report.json")
    return parser.parse_args(argv)


def ensure_version():
    actual = bpy.app.version_string
    if not actual.startswith(BLENDER_PRODUCTION_VERSION):
        raise RuntimeError(
            f"Production exports require Blender {BLENDER_PRODUCTION_VERSION}; running {actual}"
        )


def safe_index_from_name(name: str):
    patterns = (
        r"rock[_\-\s]*0*(\d{1,3})",
        r"0*(\d{1,3})[_\-\s]*lod2",
        r"lod2[_\-\s]*0*(\d{1,3})",
    )
    lowered = name.lower()
    for pattern in patterns:
        match = re.search(pattern, lowered)
        if match:
            value = int(match.group(1))
            if 1 <= value <= 20:
                return value
    return None


def natural_key(value: str):
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", value)]


def triangle_count(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        return len(mesh.loop_triangles)
    finally:
        evaluated.to_mesh_clear()


def discover_source_objects():
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    if len(meshes) != 20:
        raise RuntimeError(f"Expected exactly 20 source meshes, found {len(meshes)}")

    mapped = {}
    for obj in meshes:
        index = safe_index_from_name(f"{obj.name} {obj.data.name if obj.data else ''}")
        if index is not None:
            if index in mapped:
                raise RuntimeError(f"Duplicate inferred rock index {index}: {mapped[index].name} / {obj.name}")
            mapped[index] = obj

    if set(mapped) == set(range(1, 21)):
        return mapped, "name"

    ordered = sorted(meshes, key=lambda obj: natural_key(obj.name))
    return {index: obj for index, obj in enumerate(ordered, start=1)}, "natural-name-order"


def bbox_from_vertices(obj):
    coords = [vertex.co for vertex in obj.data.vertices]
    xs = [co.x for co in coords]
    ys = [co.y for co in coords]
    zs = [co.z for co in coords]
    return {
        "min": [min(xs), min(ys), min(zs)],
        "max": [max(xs), max(ys), max(zs)],
        "size": [max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)],
    }


def normalize_duplicate(source, rock_id):
    duplicate = source.copy()
    duplicate.data = source.data.copy()
    bpy.context.scene.collection.objects.link(duplicate)
    duplicate.name = rock_id
    duplicate.data.name = f"{rock_id}-mesh"

    # Bake the source transform into geometry so the exported node is identity-based.
    duplicate.data.transform(duplicate.matrix_world)
    duplicate.matrix_world = Matrix.Identity(4)

    bbox = bbox_from_vertices(duplicate)
    size = bbox["size"]
    longest = max(size)
    if longest <= 0:
        raise RuntimeError(f"{rock_id}: invalid zero-sized mesh")

    center_x = (bbox["min"][0] + bbox["max"][0]) / 2
    center_y = (bbox["min"][1] + bbox["max"][1]) / 2
    floor_z = bbox["min"][2]
    duplicate.data.transform(Matrix.Translation(Vector((-center_x, -center_y, -floor_z))))
    scale = TARGET_MAX_DIMENSION / longest
    duplicate.data.transform(Matrix.Scale(scale, 4))
    duplicate.data.update()

    if not duplicate.data.uv_layers:
        raise RuntimeError(f"{rock_id}: source mesh has no UV layer")

    for polygon in duplicate.data.polygons:
        polygon.use_smooth = True

    return duplicate, bbox, scale


def build_material(rock_id, index, resource_root: Path):
    base_path = resource_root / f"rock_{index:03d}_LOD2.jpeg"
    normal_path = resource_root / f"rock_{index:03d}_LOD2_normal.jpeg"
    if not base_path.exists() or not normal_path.exists():
        raise RuntimeError(f"{rock_id}: missing LOD2 source texture(s)")

    material = bpy.data.materials.new(f"{rock_id}-pbr")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    base_tex = nodes.new("ShaderNodeTexImage")
    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_map = nodes.new("ShaderNodeNormalMap")

    base_tex.image = bpy.data.images.load(str(base_path.resolve()), check_existing=True)
    normal_tex.image = bpy.data.images.load(str(normal_path.resolve()), check_existing=True)
    normal_tex.image.colorspace_settings.name = "Non-Color"
    normal_map.inputs["Strength"].default_value = NORMAL_STRENGTH

    bsdf.inputs["Roughness"].default_value = ROUGHNESS
    bsdf.inputs["Metallic"].default_value = 0.0

    links.new(base_tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    return material, base_path, normal_path


def export_glb(obj, destination: Path):
    destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_viewport = False
    obj.hide_render = False
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    bpy.ops.export_scene.gltf(
        filepath=str(destination.resolve()),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )


def parse_glb_json(path: Path):
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise RuntimeError(f"{path}: invalid GLB header")
    version, total_length = struct.unpack_from("<II", data, 4)
    if version != 2 or total_length != len(data):
        raise RuntimeError(f"{path}: invalid GLB version/length")
    json_length, json_type = struct.unpack_from("<II", data, 12)
    if json_type != 0x4E4F534A:
        raise RuntimeError(f"{path}: first GLB chunk is not JSON")
    payload = data[20 : 20 + json_length].decode("utf-8").rstrip(" \t\r\n\x00")
    return json.loads(payload), len(data)


def validate_glb(path: Path, rock_id: str):
    document, byte_size = parse_glb_json(path)
    if byte_size > MAX_GLB_BYTES:
        raise RuntimeError(f"{rock_id}: GLB is {byte_size / 1024 / 1024:.2f} MiB (> 5 MiB budget)")
    if document.get("cameras"):
        raise RuntimeError(f"{rock_id}: camera leaked into GLB")
    if "KHR_lights_punctual" in document.get("extensions", {}):
        raise RuntimeError(f"{rock_id}: light leaked into GLB")
    if len(document.get("meshes", [])) != 1:
        raise RuntimeError(f"{rock_id}: expected one mesh, got {len(document.get('meshes', []))}")
    if len(document.get("materials", [])) != 1:
        raise RuntimeError(f"{rock_id}: expected one material")
    if len(document.get("images", [])) < 2:
        raise RuntimeError(f"{rock_id}: base color and normal map were not embedded")
    if any(buffer.get("uri") for buffer in document.get("buffers", [])):
        raise RuntimeError(f"{rock_id}: external buffer dependency found")
    if any(image.get("uri") for image in document.get("images", [])):
        raise RuntimeError(f"{rock_id}: external image dependency found")

    primitive = document["meshes"][0].get("primitives", [{}])[0]
    attributes = primitive.get("attributes", {})
    if "POSITION" not in attributes or "NORMAL" not in attributes or "TEXCOORD_0" not in attributes:
        raise RuntimeError(f"{rock_id}: required POSITION/NORMAL/TEXCOORD_0 attributes missing")

    triangle_total = None
    indices_accessor = primitive.get("indices")
    if indices_accessor is not None:
        count = document["accessors"][indices_accessor].get("count", 0)
        triangle_total = count // 3

    return {
        "bytes": byte_size,
        "mib": round(byte_size / 1024 / 1024, 3),
        "embeddedImages": len(document.get("images", [])),
        "materials": len(document.get("materials", [])),
        "triangleCountFromGlb": triangle_total,
        "externalDependencies": 0,
    }


def remove_helpers():
    for obj in list(bpy.data.objects):
        if obj.get("caillou_production_helper"):
            bpy.data.objects.remove(obj, do_unlink=True)


def create_helper_object(obj):
    obj["caillou_production_helper"] = True
    bpy.context.scene.collection.objects.link(obj)
    return obj


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_preview(rock, destination: Path):
    remove_helpers()
    scene = bpy.context.scene
    destination.parent.mkdir(parents=True, exist_ok=True)

    camera_data = bpy.data.cameras.new("CAILLOU_Production_Camera")
    camera = create_helper_object(bpy.data.objects.new("CAILLOU_Production_Camera", camera_data))
    camera.location = (3.25, -4.2, 2.6)
    camera_data.lens = 58
    point_at(camera, (0, 0, 0.75))
    scene.camera = camera

    floor_mesh = bpy.data.meshes.new("CAILLOU_Production_Floor_Mesh")
    floor_mesh.from_pydata([(-6, -6, -0.035), (6, -6, -0.035), (6, 6, -0.035), (-6, 6, -0.035)], [], [(0, 1, 2, 3)])
    floor_mesh.update()
    floor = create_helper_object(bpy.data.objects.new("CAILLOU_Production_Floor", floor_mesh))
    floor_mat = bpy.data.materials.new("CAILLOU_Production_Floor_Material")
    floor_mat.diffuse_color = (0.75, 0.72, 0.67, 1.0)
    floor.data.materials.append(floor_mat)

    def area(name, location, energy, size):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = create_helper_object(bpy.data.objects.new(name, data))
        light.location = location
        point_at(light, (0, 0, 0.7))
        return light

    area("CAILLOU_Key", (3.8, -3.4, 5.4), 760, 4.0)
    area("CAILLOU_Fill", (-4.2, -1.2, 2.8), 360, 4.5)
    area("CAILLOU_Rim", (0.5, 3.5, 4.2), 520, 3.0)

    for candidate in bpy.data.objects:
        if candidate.type == "MESH" and candidate != rock and not candidate.get("caillou_production_helper"):
            candidate.hide_render = True

    rock.hide_render = False
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.filepath = str(destination.resolve())
    scene.world.color = (0.78, 0.76, 0.72)

    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass

    bpy.ops.render.render(write_still=True)
    remove_helpers()


def write_report(path: Path, report):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")


def main():
    args = parse_args()
    ensure_version()

    repo_root = Path.cwd()
    resource_root = repo_root / "Ressource"
    output_root = repo_root / args.output_root
    preview_root = repo_root / args.preview_root
    report_path = repo_root / args.report

    mapping, mapping_strategy = discover_source_objects()
    indices = [1, 2] if args.mode == "slice" else list(range(1, 21))
    source_blend = Path(bpy.data.filepath).name if bpy.data.filepath else None

    report = {
        "pipelineVersion": 1,
        "mode": args.mode,
        "blenderVersion": bpy.app.version_string,
        "blenderPinned": BLENDER_PRODUCTION_VERSION,
        "sourceBlend": source_blend,
        "mappingStrategy": mapping_strategy,
        "provenance": {
            "title": SOURCE_TITLE,
            "author": SOURCE_AUTHOR,
            "url": SOURCE_URL,
            "license": SOURCE_LICENSE,
            "licenseUrl": SOURCE_LICENSE_URL,
            "modifications": "LOD2 isolated; transform normalized; PBR material rebuilt for glTF; roughness and normal strength calibrated for web presentation.",
        },
        "rocks": [],
    }

    for index in indices:
        rock_id = f"rock-{index:03d}"
        source = mapping[index]
        source_triangles = triangle_count(source)
        if not (8000 <= source_triangles <= 12000):
            raise RuntimeError(f"{rock_id}: expected LOD2 around 10k triangles, got {source_triangles}")

        rock, source_bbox, normalization_scale = normalize_duplicate(source, rock_id)
        material, base_path, normal_path = build_material(rock_id, index, resource_root)
        rock.data.materials.clear()
        rock.data.materials.append(material)

        glb_path = output_root / rock_id / "model.glb"
        preview_path = preview_root / f"{rock_id}.png"
        export_glb(rock, glb_path)
        validation = validate_glb(glb_path, rock_id)
        render_preview(rock, preview_path)

        normalized_bbox = bbox_from_vertices(rock)
        entry = {
            "id": rock_id,
            "catalogIndex": index,
            "label": f"Spécimen {index:02d}",
            "sourceMesh": source.name,
            "sourceTriangles": source_triangles,
            "sourceDimensions": [round(float(v), 6) for v in source.dimensions],
            "sourceBounds": source_bbox,
            "normalizationScale": normalization_scale,
            "normalizedBounds": normalized_bbox,
            "modelPath": f"/assets/rocks/{rock_id}/model.glb",
            "previewPath": f"/assets/rock-previews/{rock_id}.png",
            "baseColorSource": str(base_path.relative_to(repo_root)),
            "normalSource": str(normal_path.relative_to(repo_root)),
            "roughness": ROUGHNESS,
            "normalStrength": NORMAL_STRENGTH,
            "validation": validation,
        }
        report["rocks"].append(entry)
        print(f"[CAILLOU] {rock_id}: {source_triangles} tris, {validation['mib']} MiB, PASS")

        bpy.data.objects.remove(rock, do_unlink=True)

    report["summary"] = {
        "count": len(report["rocks"]),
        "meanMiB": round(sum(r["validation"]["mib"] for r in report["rocks"]) / len(report["rocks"]), 3),
        "maxMiB": max(r["validation"]["mib"] for r in report["rocks"]),
        "allEmbedded": all(r["validation"]["externalDependencies"] == 0 for r in report["rocks"]),
    }
    write_report(report_path, report)

    catalog_path = output_root / "catalog.json"
    catalog_path.parent.mkdir(parents=True, exist_ok=True)
    catalog_path.write_text(json.dumps(report["rocks"], indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[CAILLOU] Production report written to {report_path}")


if __name__ == "__main__":
    main()
