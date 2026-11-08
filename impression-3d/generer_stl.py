"""Génère porte-manteau.stl avec la même géométrie que porte-manteau.scad."""
import sys
import numpy as np
import trimesh
from manifold3d import CrossSection, Manifold, JoinType, OpType, set_circular_segments

set_circular_segments(64)
out = sys.argv[1] if len(sys.argv) > 1 else "porte-manteau.stl"

T, H, W = 6, 90, 25
AV, RB, RK, HB = 55, 6, 7.5, 36
DV, DT, ZV = 4.5, 9, [54, 78]

def circ(c, r):
    return CrossSection.circle(r).translate(c)

def rect(x, y, w, h):
    return CrossSection.square([w, h]).translate([x, y])

plate = rect(0, 0, T, H).offset(-2, JoinType.Miter).offset(2, JoinType.Round)
gusset = CrossSection.batch_hull([rect(0, 8, T, 38), circ([22, 14], RB)])
pts = [[T, 18], [22, 14], [AV - 10, 13], [AV, 22], [AV + 1, HB - 6]]
arm = [CrossSection.batch_hull([circ(a, RB), circ(b, RB)]) for a, b in zip(pts, pts[1:])]
knob = circ([AV + 1, HB], RK)
profile = CrossSection.batch_boolean([plate, gusset, knob, *arm], OpType.Add)

body = Manifold.extrude(profile, W)

cs = (DT - DV) / 2
for z in ZV:
    shaft = Manifold.cylinder(T + 2, DV / 2, DV / 2)
    cone = Manifold.cylinder(cs + 0.01, DV / 2, DT / 2).translate([0, 0, T + 1 - cs])
    head = Manifold.cylinder(5, DT / 2, DT / 2).translate([0, 0, T + 1])
    hole = (shaft + cone + head).rotate([0, 90, 0]).translate([-1, z, W / 2])
    body = body - hole

m = body.to_mesh()
mesh = trimesh.Trimesh(np.asarray(m.vert_properties)[:, :3], np.asarray(m.tri_verts))
mesh.export(out)
print("watertight:", mesh.is_watertight, "volume cm3:", round(mesh.volume / 1000, 1),
      "bbox:", np.round(mesh.extents, 1))
