import argparse
import json
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser(description="Audit rock meshes from a Blender source file")
    parser.add_argument("--output", default="audit", help="Output directory")
    return parser.parse_args(argv)


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def safe_name(name: str) -> str:
    cleaned = "".join(c.lower() if c.isalnum() else "-" for c in name)
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or "rock"


def object_triangle_count(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        return len(mesh.loop_triangles)
    finally:
        evaluated.to_mesh_clear()


def material_info(obj):
    materials = []
    image_paths = set()

    for slot in obj.material_slots:
        material = slot.material
        if not material:
            continue

        mat_entry = {
            "name": material.name,
            "use_nodes": bool(material.use_nodes),
            "images": [],
        }

        if material.use_nodes and material.node_tree:
            for node in material.node_tree.nodes:
                if node.type == "TEX_IMAGE" and getattr(node, "image", None):
                    image = node.image
                    path = bpy.path.abspath(image.filepath) if image.filepath else ""
                    image_entry = {
                        "name": image.name,
                        "filepath": path,
                        "exists": bool(path and os.path.exists(path)),
                        "size": list(image.size[:2]) if image.size else [0, 0],
                    }
                    mat_entry["images"].append(image_entry)
                    if path:
                        image_paths.add(path)

        materials.append(mat_entry)

    return materials, sorted(image_paths)


def world_bbox(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    xs = [p.x for p in points]
    ys = [p.y for p in points]
    zs = [p.z for p in points]
    return {
        "min": [min(xs), min(ys), min(zs)],
        "max": [max(xs), max(ys), max(zs)],
        "center": [
            (min(xs) + max(xs)) / 2,
            (min(ys) + max(ys)) / 2,
            (min(zs) + max(zs)) / 2,
        ],
        "size": [max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)],
    }


def remove_audit_helpers():
    for obj in list(bpy.data.objects):
        if obj.get("caillou_audit_helper"):
            bpy.data.objects.remove(obj, do_unlink=True)


def add_camera_and_stage(bbox):
    scene = bpy.context.scene
    remove_audit_helpers()

    center = Vector(bbox["center"])
    size = Vector(bbox["size"])
    radius = max(size.x, size.y, size.z, 0.01)

    camera_data = bpy.data.cameras.new("CAILLOU_Audit_Camera")
    camera = bpy.data.objects.new("CAILLOU_Audit_Camera", camera_data)
    camera["caillou_audit_helper"] = True
    scene.collection.objects.link(camera)
    scene.camera = camera

    camera.location = center + Vector((radius * 1.8, -radius * 2.4, radius * 1.35))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 58

    floor_mesh = bpy.data.meshes.new("CAILLOU_Audit_Floor_Mesh")
    floor = bpy.data.objects.new("CAILLOU_Audit_Floor", floor_mesh)
    floor["caillou_audit_helper"] = True
    scene.collection.objects.link(floor)

    half = radius * 5
    z = bbox["min"][2] - radius * 0.025
    verts = [(-half, -half, z), (half, -half, z), (half, half, z), (-half, half, z)]
    floor_mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
    floor_mesh.update()

    mat = bpy.data.materials.new("CAILLOU_Audit_Floor_Material")
    mat.diffuse_color = (0.11, 0.11, 0.105, 1.0)
    floor.data.materials.append(mat)


def configure_render(output_path: Path):
    scene = bpy.context.scene

    # Casting previews favor speed and recognizability over final visual quality.
    # The premium studio render comes later for selected CAILLOU™ specimens.
    scene.render.engine = "BLENDER_WORKBENCH"
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.color_type = "TEXTURE"

    if hasattr(shading, "show_shadows"):
        shading.show_shadows = True
    if hasattr(shading, "show_cavity"):
        shading.show_cavity = True
    if hasattr(shading, "cavity_type"):
        shading.cavity_type = "WORLD"
    if hasattr(shading, "show_specular_highlight"):
        shading.show_specular_highlight = True
    if hasattr(shading, "background_type"):
        shading.background_type = "VIEWPORT"
    if hasattr(shading, "background_color"):
        shading.background_color = (0.025, 0.025, 0.022)

    scene.render.resolution_x = 480
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.filepath = str(output_path)


def render_preview(obj, all_mesh_objects, output_path):
    for candidate in all_mesh_objects:
        candidate.hide_render = candidate != obj
        candidate.hide_viewport = candidate != obj

    obj.hide_render = False
    obj.hide_viewport = False

    bbox = world_bbox(obj)
    add_camera_and_stage(bbox)
    configure_render(output_path)

    try:
        bpy.ops.render.render(write_still=True)
        return True, None
    except Exception as exc:
        return False, str(exc)


def restore_visibility(mesh_objects):
    for obj in mesh_objects:
        obj.hide_render = False
        obj.hide_viewport = False
    remove_audit_helpers()


def write_inventory(output_dir, inventory):
    (output_dir / "inventory.json").write_text(
        json.dumps(inventory, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    md_lines = [
        "# CAILLOU™ — Audit automatique du fichier Blender",
        "",
        f"- Source : `{inventory['source_blend']}`",
        f"- Blender : `{inventory['blender_version']}`",
        f"- Objets mesh détectés : **{inventory['mesh_object_count']}**",
        "",
        "| # | Objet | Triangles | Sommets | UV | Matériaux | Textures | Preview |",
        "|---:|---|---:|---:|---:|---:|---:|---|",
    ]

    for entry in inventory["objects"]:
        preview = f"[PNG]({entry['preview']})" if entry["preview"] else "en attente / échec"
        md_lines.append(
            f"| {entry['index']} | `{entry['name']}` | {entry['triangles']} | "
            f"{entry['vertices']} | {len(entry['uv_layers'])} | {len(entry['materials'])} | "
            f"{len(entry['image_paths'])} | {preview} |"
        )

    md_lines.extend(
        [
            "",
            "## Interprétation",
            "",
            "Cet audit est volontairement descriptif. Il ne modifie pas le fichier `.blend` source et ne publie aucun asset final.",
            "Les previews Workbench servent uniquement au casting mobile des futurs spécimens CAILLOU™.",
            "",
        ]
    )

    (output_dir / "inventory.md").write_text("\n".join(md_lines), encoding="utf-8")


def main():
    args = parse_args()
    output_dir = Path(args.output).resolve()
    previews_dir = output_dir / "previews"
    ensure_dir(previews_dir)

    source_blend = Path(bpy.data.filepath).resolve() if bpy.data.filepath else None
    mesh_objects = [
        obj
        for obj in bpy.data.objects
        if obj.type == "MESH" and not obj.get("caillou_audit_helper")
    ]

    inventory = {
        "source_blend": str(source_blend) if source_blend else None,
        "blender_version": bpy.app.version_string,
        "mesh_object_count": len(mesh_objects),
        "objects": [],
    }

    # First write the full technical inventory before any rendering begins.
    for index, obj in enumerate(mesh_objects, start=1):
        bbox = world_bbox(obj)
        materials, image_paths = material_info(obj)
        triangles = object_triangle_count(obj)
        uv_layers = [layer.name for layer in obj.data.uv_layers] if getattr(obj.data, "uv_layers", None) else []
        preview_name = f"{index:02d}-{safe_name(obj.name)}.png"

        inventory["objects"].append(
            {
                "index": index,
                "name": obj.name,
                "mesh_name": obj.data.name if obj.data else None,
                "triangles": triangles,
                "vertices": len(obj.data.vertices) if obj.data else 0,
                "dimensions": [float(v) for v in obj.dimensions],
                "bbox": bbox,
                "uv_layers": uv_layers,
                "materials": materials,
                "image_paths": image_paths,
                "preview": None,
                "preview_error": None,
                "preview_filename": preview_name,
            }
        )

        print(
            f"[CAILLOU] inventory {index:02d}/{len(mesh_objects):02d} "
            f"{obj.name}: {triangles} tris, {len(uv_layers)} UV layer(s), "
            f"{len(materials)} material(s)"
        )

    write_inventory(output_dir, inventory)

    # Then produce fast textured casting previews.
    for entry, obj in zip(inventory["objects"], mesh_objects):
        preview_path = previews_dir / entry["preview_filename"]
        rendered, render_error = render_preview(obj, mesh_objects, preview_path)
        entry["preview"] = f"previews/{entry['preview_filename']}" if rendered else None
        entry["preview_error"] = render_error
        write_inventory(output_dir, inventory)
        print(f"[CAILLOU] preview {entry['index']:02d}/{len(mesh_objects):02d} {obj.name}: {'ok' if rendered else 'failed'}")

    restore_visibility(mesh_objects)
    write_inventory(output_dir, inventory)
    print(f"[CAILLOU] Audit written to {output_dir}")


if __name__ == "__main__":
    main()
