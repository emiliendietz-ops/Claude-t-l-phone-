"""Crée porte-manteau.3mf pour PrusaSlicer à partir de porte-manteau.stl.

Les réglages conseillés sont posés sur la pièce elle-même (réglages par objet) :
ils s'ajoutent à tes profils d'imprimante et de filament sans les remplacer.
"""
import zipfile
import numpy as np
import trimesh

m = trimesh.load("porte-manteau.stl")
m.merge_vertices()
v, f = m.vertices, m.faces
cx, cy = (v[:, 0].min() + v[:, 0].max()) / 2, (v[:, 1].min() + v[:, 1].max()) / 2
bed_x, bed_y = 125, 105  # centre du plateau d'une Prusa MK3/MK4 ; PrusaSlicer recentre si besoin

verts = "\n".join(f'<vertex x="{x:.5f}" y="{y:.5f}" z="{z:.5f}"/>' for x, y, z in v)
tris = "\n".join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in f)
model = f'''<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="fr-FR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:slic3rpe="http://schemas.slic3r.org/3mf/2017/06">
 <metadata name="slic3rpe:Version3mf">1</metadata>
 <metadata name="Title">Porte-manteau mural</metadata>
 <resources>
  <object id="1" type="model">
   <mesh>
    <vertices>
{verts}
    </vertices>
    <triangles>
{tris}
    </triangles>
   </mesh>
  </object>
 </resources>
 <build>
  <item objectid="1" transform="1 0 0 0 1 0 0 0 1 {bed_x - cx:.4f} {bed_y - cy:.4f} 0" printable="1"/>
 </build>
</model>
'''
cfg = f'''<?xml version="1.0" encoding="UTF-8"?>
<config>
 <object id="1" instances_count="1">
  <metadata type="object" key="name" value="porte-manteau"/>
  <metadata type="object" key="perimeters" value="4"/>
  <metadata type="object" key="top_solid_layers" value="5"/>
  <metadata type="object" key="bottom_solid_layers" value="4"/>
  <metadata type="object" key="fill_density" value="35%"/>
  <metadata type="object" key="fill_pattern" value="gyroid"/>
  <metadata type="object" key="support_material" value="0"/>
  <volume firstid="0" lastid="{len(f) - 1}">
   <metadata type="volume" key="name" value="porte-manteau"/>
   <metadata type="volume" key="volume_type" value="ModelPart"/>
  </volume>
 </object>
</config>
'''
types = '''<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>
'''
rels = '''<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
'''
with zipfile.ZipFile("porte-manteau.3mf", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", types)
    z.writestr("_rels/.rels", rels)
    z.writestr("3D/3dmodel.model", model)
    z.writestr("Metadata/Slic3r_PE_model.config", cfg)
print(len(v), "sommets,", len(f), "triangles")
