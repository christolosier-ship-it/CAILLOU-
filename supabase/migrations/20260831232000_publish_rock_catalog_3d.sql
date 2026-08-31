-- Generated from the validated Blender production report.
-- Assets remain static on Vercel; Supabase stores canonical catalogue metadata.
begin;
update public.rock_catalog set model_path = '/assets/rocks/rock-001/model.glb', preview_path = '/assets/rock-previews/rock-001.png', source_mesh = 'rock_001_LOD2', triangle_count = 10000, active = true where id = 'rock-001';
update public.rock_catalog set model_path = '/assets/rocks/rock-002/model.glb', preview_path = '/assets/rock-previews/rock-002.png', source_mesh = 'rock_002_LOD2', triangle_count = 10000, active = true where id = 'rock-002';
update public.rock_catalog set model_path = '/assets/rocks/rock-003/model.glb', preview_path = '/assets/rock-previews/rock-003.png', source_mesh = 'rock_003_LOD2', triangle_count = 10000, active = true where id = 'rock-003';
update public.rock_catalog set model_path = '/assets/rocks/rock-004/model.glb', preview_path = '/assets/rock-previews/rock-004.png', source_mesh = 'rock_004_LOD2', triangle_count = 10000, active = true where id = 'rock-004';
update public.rock_catalog set model_path = '/assets/rocks/rock-005/model.glb', preview_path = '/assets/rock-previews/rock-005.png', source_mesh = 'rock_005_LOD2', triangle_count = 10000, active = true where id = 'rock-005';
update public.rock_catalog set model_path = '/assets/rocks/rock-006/model.glb', preview_path = '/assets/rock-previews/rock-006.png', source_mesh = 'rock_006_LOD2', triangle_count = 10000, active = true where id = 'rock-006';
update public.rock_catalog set model_path = '/assets/rocks/rock-007/model.glb', preview_path = '/assets/rock-previews/rock-007.png', source_mesh = 'rock_007_LOD2', triangle_count = 10000, active = true where id = 'rock-007';
update public.rock_catalog set model_path = '/assets/rocks/rock-008/model.glb', preview_path = '/assets/rock-previews/rock-008.png', source_mesh = 'rock_008_LOD2', triangle_count = 10000, active = true where id = 'rock-008';
update public.rock_catalog set model_path = '/assets/rocks/rock-009/model.glb', preview_path = '/assets/rock-previews/rock-009.png', source_mesh = 'rock_009_LOD2', triangle_count = 10000, active = true where id = 'rock-009';
update public.rock_catalog set model_path = '/assets/rocks/rock-010/model.glb', preview_path = '/assets/rock-previews/rock-010.png', source_mesh = 'rock_010_LOD2', triangle_count = 10000, active = true where id = 'rock-010';
update public.rock_catalog set model_path = '/assets/rocks/rock-011/model.glb', preview_path = '/assets/rock-previews/rock-011.png', source_mesh = 'rock_011_LOD2', triangle_count = 10000, active = true where id = 'rock-011';
update public.rock_catalog set model_path = '/assets/rocks/rock-012/model.glb', preview_path = '/assets/rock-previews/rock-012.png', source_mesh = 'rock_012_LOD2', triangle_count = 10000, active = true where id = 'rock-012';
update public.rock_catalog set model_path = '/assets/rocks/rock-013/model.glb', preview_path = '/assets/rock-previews/rock-013.png', source_mesh = 'rock_013_LOD2', triangle_count = 10000, active = true where id = 'rock-013';
update public.rock_catalog set model_path = '/assets/rocks/rock-014/model.glb', preview_path = '/assets/rock-previews/rock-014.png', source_mesh = 'rock_014_LOD2', triangle_count = 10000, active = true where id = 'rock-014';
update public.rock_catalog set model_path = '/assets/rocks/rock-015/model.glb', preview_path = '/assets/rock-previews/rock-015.png', source_mesh = 'rock_015_LOD2', triangle_count = 10000, active = true where id = 'rock-015';
update public.rock_catalog set model_path = '/assets/rocks/rock-016/model.glb', preview_path = '/assets/rock-previews/rock-016.png', source_mesh = 'rock_016_LOD2', triangle_count = 10000, active = true where id = 'rock-016';
update public.rock_catalog set model_path = '/assets/rocks/rock-017/model.glb', preview_path = '/assets/rock-previews/rock-017.png', source_mesh = 'rock_017_LOD2', triangle_count = 10000, active = true where id = 'rock-017';
update public.rock_catalog set model_path = '/assets/rocks/rock-018/model.glb', preview_path = '/assets/rock-previews/rock-018.png', source_mesh = 'rock_018_LOD2', triangle_count = 10000, active = true where id = 'rock-018';
update public.rock_catalog set model_path = '/assets/rocks/rock-019/model.glb', preview_path = '/assets/rock-previews/rock-019.png', source_mesh = 'rock_019_LOD2', triangle_count = 10000, active = true where id = 'rock-019';
update public.rock_catalog set model_path = '/assets/rocks/rock-020/model.glb', preview_path = '/assets/rock-previews/rock-020.png', source_mesh = 'rock_020_LOD2', triangle_count = 10000, active = true where id = 'rock-020';
do $$ begin if (select count(*) from public.rock_catalog where active) <> 20 then raise exception 'Expected 20 active rock catalogue rows'; end if; end $$;
commit;
