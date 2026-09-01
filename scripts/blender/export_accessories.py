"""Reproducible accessory production for CAILLOU™.

Run from the repository root with the pinned Blender build:

    blender -b --python scripts/blender/export_accessories.py

Only entries whose provenance is verified and whose status is ``published`` are
exported. Unknown sources remain visible in the audit report but can never leak
into the runtime catalogue by accident.
"""

from __future__ import annotations

import hashlib
import json
import math
import shutil
import struct
import subprocess
import sys
import tempfile
import traceback
import zipfile
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


BLENDER_PRODUCTION_VERSION = "4.5.13"
MANIFEST_PATH = Path("scripts/blender/accessory_sources.json")
OUTPUT_ROOT = Path("public/assets/accessories")
PREVIEW_ROOT = Path("public/assets/accessory-previews")
REPORT_PATH = Path("build/accessory-production/report.json")
CATALOG_PATH = OUTPUT_ROOT / "catalog.json"
TARGET_TEXTURE_SIZE = 1024
MAX_GLB_BYTES = 4 * 1024 * 1024
SUPPORTED_SOURCE_FORMATS = {"blend", "dae", "fbx", "glb", "gltf", "obj", "rar", "zip"}


def ensure_version() -> None:
    if not bpy.app.version_string.startswith(BLENDER_PRODUCTION_VERSION):
        raise RuntimeError(
            f"Accessory production requires Blender {BLENDER_PRODUCTION_VERSION}; "
            f"running {bpy.app.version_string}"
        )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clean_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def safe_archive_target(root: Path, member: str) -> Path:
    target = (root / member).resolve()
    if root.resolve() not in target.parents and target != root.resolve():
        raise RuntimeError(f"Unsafe archive member path: {member}")
    return target


def extract_archive(source: Path, entry: str, staging: Path) -> Path:
    suffix = source.suffix.lower()
    if suffix == ".zip":
        with zipfile.ZipFile(source) as archive:
            for member in archive.namelist():
                safe_archive_target(staging, member)
            archive.extractall(staging)
    elif suffix == ".rar":
        unrar = shutil.which("unrar")
        if not unrar:
            raise RuntimeError("RAR sources require the unrar executable")
        subprocess.run(
            [unrar, "x", "-idq", "-o+", str(source.resolve()), str(staging.resolve())],
            check=True,
        )
    else:
        raise RuntimeError(f"Unsupported archive: {source}")
    target = safe_archive_target(staging, entry)
    if not target.is_file():
        raise RuntimeError(f"Archive member not found: {entry}")
    return target


def import_source(source_config: dict, staging: Path) -> Path:
    source = Path(source_config["file"])
    if not source.is_file():
        raise RuntimeError(f"Missing source file: {source}")

    source_format = source_config.get("format", source.suffix.lstrip(".")).lower()
    if source_format not in SUPPORTED_SOURCE_FORMATS:
        raise RuntimeError(f"Unsupported source format: {source_format}")

    imported_path = source
    if source_format in {"rar", "zip"}:
        entry = source_config.get("entry")
        if not entry:
            raise RuntimeError(f"Archive source {source} has no entry")
        imported_path = extract_archive(source, entry, staging)
        source_format = imported_path.suffix.lstrip(".").lower()

    filepath = str(imported_path.resolve())
    if source_format == "dae":
        bpy.ops.wm.collada_import(filepath=filepath)
    elif source_format == "fbx":
        bpy.ops.import_scene.fbx(filepath=filepath)
    elif source_format == "obj":
        bpy.ops.wm.obj_import(filepath=filepath)
    elif source_format in {"glb", "gltf"}:
        bpy.ops.import_scene.gltf(filepath=filepath)
    elif source_format == "blend":
        with bpy.data.libraries.load(filepath, link=False) as (source_data, target_data):
            target_data.objects = list(source_data.objects)
        for obj in target_data.objects:
            if obj is not None:
                bpy.context.scene.collection.objects.link(obj)
    else:
        raise RuntimeError(f"Archive entry has unsupported format: {source_format}")

    return imported_path


def triangle_count(obj: bpy.types.Object) -> int:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        return len(mesh.loop_triangles)
    finally:
        evaluated.to_mesh_clear()


def consolidate_meshes(accessory_id: str) -> bpy.types.Object:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"{accessory_id}: source contains no mesh")

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()

    obj = bpy.context.view_layer.objects.active
    obj.name = accessory_id
    obj.data.name = f"{accessory_id}-mesh"
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)

    for candidate in list(bpy.context.scene.objects):
        if candidate != obj:
            bpy.data.objects.remove(candidate, do_unlink=True)

    return obj


def bounds(obj: bpy.types.Object) -> dict:
    points = [vertex.co.copy() for vertex in obj.data.vertices]
    minimum = [min(point[index] for point in points) for index in range(3)]
    maximum = [max(point[index] for point in points) for index in range(3)]
    size = [maximum[index] - minimum[index] for index in range(3)]
    return {"min": minimum, "max": maximum, "size": size}


def round_vector(values) -> list[float]:
    return [round(float(value), 6) for value in values]


def normalize_mesh(obj: bpy.types.Object, config: dict) -> tuple[dict, float]:
    rotation = config.get("rotationDegrees", [0, 0, 0])
    matrix = Matrix.Identity(4)
    for axis, degrees in zip(("X", "Y", "Z"), rotation):
        matrix = Matrix.Rotation(math.radians(float(degrees)), 4, axis) @ matrix
    obj.data.transform(matrix)

    source_bounds = bounds(obj)
    longest = max(source_bounds["size"])
    if longest <= 0:
        raise RuntimeError(f"{obj.name}: zero-sized source mesh")

    center = Vector(
        (
            (source_bounds["min"][0] + source_bounds["max"][0]) / 2,
            (source_bounds["min"][1] + source_bounds["max"][1]) / 2,
            (source_bounds["min"][2] + source_bounds["max"][2]) / 2,
        )
    )
    obj.data.transform(Matrix.Translation(-center))
    normalization_scale = float(config["targetMaxDimension"]) / longest
    obj.data.transform(Matrix.Scale(normalization_scale, 4))
    obj.data.validate(clean_customdata=False)
    obj.data.update()

    if not obj.data.uv_layers:
        raise RuntimeError(f"{obj.name}: source has no UV layer")
    for polygon in obj.data.polygons:
        polygon.use_smooth = True

    bevel_config = config.get("bevel")
    if bevel_config:
        modifier = obj.modifiers.new("web-production-bevel", "BEVEL")
        modifier.width = float(bevel_config["width"])
        modifier.segments = int(bevel_config["segments"])
        modifier.limit_method = "ANGLE"
        modifier.angle_limit = math.radians(float(bevel_config["angleDegrees"]))
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.data.update()

    return {
        "min": round_vector(source_bounds["min"]),
        "max": round_vector(source_bounds["max"]),
        "size": round_vector(source_bounds["size"]),
    }, normalization_scale


def resized_image(source: Path, name: str, color_space: str, staging: Path) -> bpy.types.Image:
    if not source.is_file():
        raise RuntimeError(f"Missing texture: {source}")
    original = bpy.data.images.load(str(source.resolve()), check_existing=False)
    original.colorspace_settings.name = color_space
    original.scale(TARGET_TEXTURE_SIZE, TARGET_TEXTURE_SIZE)
    destination = staging / f"{name}.png"
    original.filepath_raw = str(destination.resolve())
    original.file_format = "PNG"
    original.save()
    bpy.data.images.remove(original)
    runtime = bpy.data.images.load(str(destination.resolve()), check_existing=False)
    runtime.colorspace_settings.name = color_space
    return runtime


def build_material(accessory_id: str, texture_config: dict, staging: Path) -> tuple[bpy.types.Material, dict]:
    required = {"baseColor", "roughness", "normal"}
    missing = required - set(texture_config)
    if missing:
        raise RuntimeError(f"{accessory_id}: missing required material maps {sorted(missing)}")

    material = bpy.data.materials.new(f"{accessory_id}-pbr")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    texture_report = {}

    def texture(kind: str, colorspace: str) -> bpy.types.Node:
        path = Path(texture_config[kind])
        image = resized_image(path, f"{accessory_id}-{kind}", colorspace, staging)
        node = nodes.new("ShaderNodeTexImage")
        node.name = f"{kind}-texture"
        node.image = image
        texture_report[kind] = {
            "source": str(path),
            "sha256": sha256(path),
            "sourceResolution": [int(value) for value in bpy.data.images.load(str(path.resolve()), check_existing=True).size],
            "runtimeResolution": [TARGET_TEXTURE_SIZE, TARGET_TEXTURE_SIZE],
        }
        return node

    base = texture("baseColor", "sRGB")
    roughness = texture("roughness", "Non-Color")
    normal = texture("normal", "Non-Color")
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = 0.8

    links.new(base.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(roughness.outputs["Color"], bsdf.inputs["Roughness"])
    links.new(normal.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])

    if "metallic" in texture_config:
        metallic = texture("metallic", "Non-Color")
        links.new(metallic.outputs["Color"], bsdf.inputs["Metallic"])
    else:
        bsdf.inputs["Metallic"].default_value = 0.0

    if "opacity" in texture_config:
        opacity = texture("opacity", "Non-Color")
        links.new(opacity.outputs["Color"], bsdf.inputs["Alpha"])
        if hasattr(material, "surface_render_method"):
            material.surface_render_method = "DITHERED"

    return material, texture_report


def export_glb(obj: bpy.types.Object, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
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
        export_jpeg_quality=85,
    )


def parse_glb(path: Path) -> tuple[dict, int]:
    payload = path.read_bytes()
    if len(payload) < 20 or payload[:4] != b"glTF":
        raise RuntimeError(f"{path}: invalid GLB header")
    version, total_length = struct.unpack_from("<II", payload, 4)
    if version != 2 or total_length != len(payload):
        raise RuntimeError(f"{path}: invalid GLB version or length")
    json_length, json_type = struct.unpack_from("<II", payload, 12)
    if json_type != 0x4E4F534A:
        raise RuntimeError(f"{path}: first chunk is not JSON")
    document = json.loads(payload[20 : 20 + json_length].decode("utf-8").rstrip(" \t\r\n\x00"))
    return document, len(payload)


def validate_glb(path: Path, accessory_id: str, expected_triangles: int) -> dict:
    document, byte_size = parse_glb(path)
    if byte_size > MAX_GLB_BYTES:
        raise RuntimeError(f"{accessory_id}: GLB exceeds 4 MiB ({byte_size} bytes)")
    if len(document.get("meshes", [])) != 1:
        raise RuntimeError(f"{accessory_id}: expected one mesh")
    if len(document.get("materials", [])) != 1:
        raise RuntimeError(f"{accessory_id}: expected one material")
    if document.get("cameras") or "KHR_lights_punctual" in document.get("extensions", {}):
        raise RuntimeError(f"{accessory_id}: camera or light leaked into runtime GLB")
    if any(buffer.get("uri") for buffer in document.get("buffers", [])):
        raise RuntimeError(f"{accessory_id}: external buffer dependency")
    if any(image.get("uri") for image in document.get("images", [])):
        raise RuntimeError(f"{accessory_id}: external image dependency")
    if len(document.get("images", [])) < 3:
        raise RuntimeError(f"{accessory_id}: required PBR textures were not embedded")

    primitive = document["meshes"][0].get("primitives", [{}])[0]
    attributes = primitive.get("attributes", {})
    required = {"POSITION", "NORMAL", "TEXCOORD_0"}
    if not required.issubset(attributes):
        raise RuntimeError(f"{accessory_id}: missing GLB attributes {sorted(required - set(attributes))}")
    indices = primitive.get("indices")
    triangle_total = None if indices is None else document["accessors"][indices]["count"] // 3
    if triangle_total != expected_triangles:
        raise RuntimeError(
            f"{accessory_id}: source/export triangle mismatch {expected_triangles}/{triangle_total}"
        )

    return {
        "bytes": byte_size,
        "mib": round(byte_size / 1024 / 1024, 3),
        "meshCount": 1,
        "materialCount": 1,
        "embeddedImages": len(document.get("images", [])),
        "externalDependencies": 0,
        "triangleCountFromGlb": triangle_total,
    }


def create_helper(obj: bpy.types.Object) -> bpy.types.Object:
    obj["caillou_accessory_preview_helper"] = True
    bpy.context.scene.collection.objects.link(obj)
    return obj


def point_at(obj: bpy.types.Object, target) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_preview(obj: bpy.types.Object, destination: Path) -> None:
    scene = bpy.context.scene
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Accessory_Preview_World")
    destination.parent.mkdir(parents=True, exist_ok=True)
    obj_bounds = bounds(obj)
    dimensions = obj_bounds["size"]
    radius = max(dimensions) * 0.5

    camera_data = bpy.data.cameras.new("Accessory_Preview_Camera")
    camera = create_helper(bpy.data.objects.new("Accessory_Preview_Camera", camera_data))
    distance = max(1.6, radius / math.tan(math.radians(24)) * 1.35)
    camera.location = (distance * 0.7, -distance, distance * 0.52)
    camera_data.lens = 58
    point_at(camera, (0, 0, 0))
    scene.camera = camera

    def area(name: str, location, energy: float, size: float) -> None:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = create_helper(bpy.data.objects.new(name, data))
        light.location = location
        point_at(light, (0, 0, 0))

    area("Accessory_Key", (2.8, -3.2, 4.1), 520, 3.2)
    area("Accessory_Fill", (-3.0, -1.2, 1.8), 260, 3.8)
    area("Accessory_Rim", (1.0, 3.1, 3.0), 420, 2.6)

    # Cycles CPU also works in minimal headless environments without EGL. The
    # catalogue is intentionally small, so deterministic previews are worth the
    # few extra seconds here; runtime rendering is still validated in WebGL.
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
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


def catalog_record(entry: dict, normalized_bounds: dict, triangles: int) -> dict:
    accessory_id = entry["id"]
    commercial = entry["catalog"]
    return {
        "id": accessory_id,
        "name": commercial["name"],
        "description": commercial["description"],
        "priceLithons": commercial["priceLithons"],
        "category": commercial["category"],
        "sortOrder": commercial["sortOrder"],
        "modelPath": f"/assets/accessories/{accessory_id}/model.glb",
        "previewPath": f"/assets/accessory-previews/{accessory_id}.png",
        "triangleCount": triangles,
        "dimensions": normalized_bounds["size"],
        "pivot": entry["transform"]["pivot"],
        "scaleMin": commercial["scaleMin"],
        "scaleMax": commercial["scaleMax"],
        "physics": entry["physics"],
        "provenance": entry["provenance"],
    }


def main() -> None:
    ensure_version()
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if manifest.get("blenderPinned") != BLENDER_PRODUCTION_VERSION:
        raise RuntimeError("Manifest and exporter Blender pins disagree")

    entries = manifest.get("entries", [])
    published = [entry for entry in entries if entry.get("status") == "published"]
    quarantined = [entry for entry in entries if entry.get("status") != "published"]
    if not published:
        raise RuntimeError("Accessory catalogue has no publishable entry")
    if any(not entry.get("provenance", {}).get("verified") for entry in published):
        raise RuntimeError("An accessory cannot be published without verified provenance")

    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)
    if PREVIEW_ROOT.exists():
        shutil.rmtree(PREVIEW_ROOT)
    OUTPUT_ROOT.mkdir(parents=True)
    PREVIEW_ROOT.mkdir(parents=True)

    report = {
        "pipelineVersion": 1,
        "blenderVersion": bpy.app.version_string,
        "blenderPinned": BLENDER_PRODUCTION_VERSION,
        "textureTarget": [TARGET_TEXTURE_SIZE, TARGET_TEXTURE_SIZE],
        "supportedSourceFormats": sorted(SUPPORTED_SOURCE_FORMATS),
        "published": [],
        "quarantined": [
            {
                "id": entry["id"],
                "source": entry["source"],
                "reason": entry["quarantineReason"],
                "sourceSha256": sha256(Path(entry["source"]["file"])),
            }
            for entry in quarantined
        ],
    }
    catalog = []

    with tempfile.TemporaryDirectory(prefix="caillou-accessory-production-") as temp_root:
        temporary = Path(temp_root)
        for entry in published:
            accessory_id = entry["id"]
            clean_scene()
            asset_staging = temporary / accessory_id
            asset_staging.mkdir(parents=True)
            imported = import_source(entry["source"], asset_staging)
            obj = consolidate_meshes(accessory_id)
            source_triangles = triangle_count(obj)
            source_bounds, normalization_scale = normalize_mesh(obj, entry["transform"])
            runtime_triangles = triangle_count(obj)

            material, texture_report = build_material(accessory_id, entry["textures"], asset_staging)
            obj.data.materials.clear()
            obj.data.materials.append(material)

            destination = OUTPUT_ROOT / accessory_id / "model.glb"
            preview = PREVIEW_ROOT / f"{accessory_id}.png"
            export_glb(obj, destination)
            validation = validate_glb(destination, accessory_id, runtime_triangles)
            render_preview(obj, preview)
            normalized = bounds(obj)
            normalized_bounds = {
                "min": round_vector(normalized["min"]),
                "max": round_vector(normalized["max"]),
                "size": round_vector(normalized["size"]),
            }

            record = catalog_record(entry, normalized_bounds, runtime_triangles)
            catalog.append(record)
            report["published"].append(
                {
                    **record,
                    "source": entry["source"],
                    "importedFile": imported.name,
                    "sourceSha256": sha256(Path(entry["source"]["file"])),
                    "sourceBounds": source_bounds,
                    "sourceTriangleCount": source_triangles,
                    "runtimeTriangleCount": runtime_triangles,
                    "normalizationScale": round(normalization_scale, 9),
                    "textures": texture_report,
                    "validation": validation,
                }
            )
            print(
                f"[CAILLOU] {accessory_id}: {source_triangles} source tris, "
                f"{runtime_triangles} runtime tris, "
                f"{validation['mib']} MiB, {validation['embeddedImages']} embedded images, PASS"
            )

    report["summary"] = {
        "publishedCount": len(report["published"]),
        "quarantinedCount": len(report["quarantined"]),
        "allStandalone": all(
            item["validation"]["externalDependencies"] == 0 for item in report["published"]
        ),
        "maxGlbMiB": max(item["validation"]["mib"] for item in report["published"]),
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    CATALOG_PATH.write_text(
        json.dumps({"schemaVersion": 1, "accessories": catalog}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"[CAILLOU] Accessory report written to {REPORT_PATH}")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
