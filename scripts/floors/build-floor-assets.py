from pathlib import Path
from PIL import Image,ImageDraw
import zipfile,json,hashlib
import argparse
parser=argparse.ArgumentParser(description='Build versioned WebP floor maps from ambientCG 1K-JPG source archives.')
parser.add_argument('source_dir',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
entries=[
('moquette','Moquette','Un accueil feutré, sans obligation de retirer ses chaussures.','Carpet004',60,0.95,0.22,[4,4]),
('parquet-chene','Parquet chêne','Des lames chaleureuses pour un résident immobile.','WoodFloor051',140,0.62,0.35,[3,3]),
('beton-cire','Béton ciré','Une surface sobre, lissée avec application.','Concrete033',90,0.42,0.18,[3,3]),
('terre','Terre','Le retour aux origines, en intérieur.','Ground048',40,1,0.5,[4,4]),
('carrelage','Carrelage','Des joints réguliers pour une vie sans imprévu.','Tiles074',100,0.55,0.35,[3,3]),
('herbe','Herbe','Un carré de verdure sans tonte à prévoir.','Grass001',75,1,0.6,[4,4]),
('marbre','Marbre','Un standing auquel votre caillou ne s’attendait pas.','Marble006',200,0.3,0.12,[2,2]),
('neige','Neige','Un hiver permanent, sans baisse de température.','Snow001',110,0.95,0.35,[3,3]),
]
manifest=[];contact=Image.new('RGB',(4*300,2*330),'#e5e1d8');draw=ImageDraw.Draw(contact)
for i,(id,name,desc,asset,price,rough,normal,repeat) in enumerate(entries):
 src=args.source_dir/(asset+'.zip');dest=root/'public/assets/floors'/id/'v1';dest.mkdir(parents=True,exist_ok=True)
 base='/assets/floors/'+id+'/v1/'
 with zipfile.ZipFile(src) as z:
  for role,token,size,quality in [('color','_Color.',1024,86),('normal','_NormalGL.',512,90),('roughness','_Roughness.',512,85)]:
   n=next(n for n in z.namelist() if token in n)
   with z.open(n) as f:im=Image.open(f).convert('RGB').resize((size,size),Image.Resampling.LANCZOS)
   im.save(dest/(role+'.webp'),quality=quality,method=6)
   if role=='color':
    preview=im.resize((256,256),Image.Resampling.LANCZOS);preview.save(dest/'preview.webp',quality=85,method=6)
    contact.paste(im.resize((300,300)),((i%4)*300,(i//4)*330));draw.text(((i%4)*300+8,(i//4)*330+308),name,fill='black')
 material=dict(version=1,color='#ffffff',roughness=rough,metalness=0,repeat=repeat,normalScale=normal,colorMap=base+'color.webp',normalMap=base+'normal.webp',roughnessMap=base+'roughness.webp')
 files={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'width':Image.open(p).width,'height':Image.open(p).height} for p in dest.glob('*.webp')}
 item=dict(id=id,name=name,description=desc,priceLithons=price,previewPath=base+'preview.webp',material=material,active=True,sortOrder=(i+1)*10,provenance={'source':'ambientCG','assetId':asset,'url':'https://ambientcg.com/view?id='+asset,'license':'CC0-1.0','sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest()},budget={'textureCount':3,'bytes':sum(v['bytes'] for v in files.values()),'files':files})
 manifest.append(item)
 print(id,item['budget']['bytes'],flush=True)
(root/'build').mkdir(exist_ok=True)
contact.save(root/'build/floor-contact.jpg')
(root/'scripts/floors/catalog.json').write_text(json.dumps({'schemaVersion':1,'floors':manifest},ensure_ascii=False,indent=2)+'\n')
p=root/'supabase/migrations/20260906090034_v2_04_decorative_floors.sql';s=p.read_text();marker='insert into public.user_floors(user_id,floor_id,acquisition_source,price_paid)\nselect id'
def q(v): return "'"+str(v).replace("'","''")+"'"
seed='insert into public.floors(id,name,description,price_lithons,preview_path,material,active,sort_order,provenance,budget) values\n'+',\n'.join('('+','.join([q(x['id']),q(x['name']),q(x['description']),str(x['priceLithons']),q(x['previewPath']),q(json.dumps(x['material'])), 'true',str(x['sortOrder']),q(json.dumps(x['provenance'])),q(json.dumps(x['budget']))])+')' for x in manifest)+';\n\n'
start=s.index('insert into public.floors(id,name,description,price_lithons,preview_path,material,active,sort_order,provenance,budget)')
end=s.index(marker,start)
s=s[:start]+seed+s[end:];p.write_text(s)
