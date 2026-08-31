"""CI entrypoint for CAILLOU rock export.

The canonical Blender exporter keeps its preview renderer for local/manual use.
CI disables that expensive EEVEE step and lets the real Three.js/WebGL
validation harness generate the catalogue previews instead.
"""

import importlib.util
from pathlib import Path


exporter_path = Path(__file__).with_name("export_rocks.py")
spec = importlib.util.spec_from_file_location("caillou_export_rocks", exporter_path)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Unable to load exporter at {exporter_path}")

exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


def skip_blender_preview(_rock, _destination):
    return None


exporter.render_preview = skip_blender_preview
exporter.main()
