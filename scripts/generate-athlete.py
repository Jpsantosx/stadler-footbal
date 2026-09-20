"""Generate the project's original, continuous humanoid surface (no external assets).
Requires numpy. Marching tetrahedra welds shared edge intersections before export;
the runtime binds this indexed surface to its animation skeleton.
"""
import json
from pathlib import Path
import numpy as np

step=.035
xs=np.arange(-.84,.841,step); ys=np.arange(-.035,2.906,step); zs=np.arange(-.35,.491,step)
x,y,z=np.meshgrid(xs,ys,zs,indexing='ij')
def ell(cx,cy,cz,rx,ry,rz):
    return (np.sqrt(((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2)-1)*min(rx,ry,rz)
def join(a,b,k=.045):
    h=np.maximum(k-np.abs(a-b),0)/k
    return np.minimum(a,b)-h*h*k*.25
# Chest, waist and pelvis have distinct, smoothly connected anatomical contours.
f=ell(0,1.96,0,.35,.26,.195)
for part in [(0,1.70,0,.265,.28,.175),(0,1.43,0,.285,.22,.18),(0,2.22,0,.10,.18,.10),(0,2.51,.006,.17,.23,.177),(0,2.39,.018,.135,.12,.15),(0,2.50,.172,.033,.055,.055)]:
    f=join(f,ell(*part))
def limb(a,b,r0,r1,depth=1):
    ax,ay,az=a; bx,by,bz=b
    t=np.clip(((x-ax)*(bx-ax)+(y-ay)*(by-ay)+(z-az)*(bz-az))/sum((v-u)**2 for u,v in zip(a,b)),0,1)
    r=r0+(r1-r0)*t
    return np.sqrt((x-ax-t*(bx-ax))**2+(y-ay-t*(by-ay))**2+((z-az-t*(bz-az))/depth)**2)-r
for side in [-1,1]:
    parts=[limb((side*.18,1.42,0),(side*.195,.81,0),.16,.108,1.04),
           limb((side*.195,.80,0),(side*.20,.21,0),.105,.063,1.12),
           ell(side*.20,.11,.09,.085,.085,.19),
           limb((side*.32,2.09,0),(side*.55,1.78,0),.135,.086,.93),
           limb((side*.55,1.78,0),(side*.62,1.43,.01),.085,.055,.91),
           ell(side*.63,1.375,.01,.065,.094,.048)]
    for shape in parts: f=join(f,shape,.035)
grad=np.stack(np.gradient(f,step),-1)
# A consistent six-tetrahedra split across all cube faces prevents cracks.
corners=np.array([[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]])
tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]]
vertices=[]; indices=[]; cache={}; dims=f.shape
for ix in range(dims[0]-1):
 for iy in range(dims[1]-1):
  for iz in range(dims[2]-1):
   cell=corners+[ix,iy,iz]; vals=f[tuple(cell.T)]
   if vals.min()>=0 or vals.max()<0: continue
   ids=np.ravel_multi_index(tuple(cell.T),dims)
   coords=np.stack([xs[cell[:,0]],ys[cell[:,1]],zs[cell[:,2]]],-1)
   def edge(a,b):
    key=tuple(sorted((int(ids[a]),int(ids[b]))))
    if key not in cache:
     t=vals[a]/(vals[a]-vals[b]); cache[key]=len(vertices); vertices.append(coords[a]+t*(coords[b]-coords[a]))
    return cache[key]
   def tri(a,b,c):
    va,vb,vc=vertices[a],vertices[b],vertices[c]
    centroid=(va+vb+vc)/3
    ijk=np.clip(np.rint((centroid-[xs[0],ys[0],zs[0]])/step).astype(int),0,np.array(dims)-1)
    if np.dot(np.cross(vb-va,vc-va),grad[tuple(ijk)])<0: b,c=c,b
    indices.extend([a,b,c])
   for tet in tets:
    inside=[i for i in tet if vals[i]<0]; outside=[i for i in tet if vals[i]>=0]
    if len(inside)==1: tri(*(edge(inside[0],j) for j in outside))
    elif len(inside)==3: tri(*(edge(outside[0],j) for j in inside))
    elif len(inside)==2:
     a,b=inside; c,d=outside; ac,ad,bc,bd=edge(a,c),edge(a,d),edge(b,c),edge(b,d)
     tri(ac,ad,bc); tri(ad,bd,bc)
# Insert shared horizontal edges at uniform boundaries. This keeps collars,
# sleeves, shorts and socks straight instead of following a jagged triangle row.
for plane in [.20,.48,.70,1.03,1.46,1.55,1.94,2.20]:
    cutcache={}; output=[]
    def intersection(a,b):
        key=tuple(sorted((a,b)))
        if key not in cutcache:
            pa,pb=vertices[a],vertices[b]
            t=(plane-pa[1])/(pb[1]-pa[1])
            if t<1e-9: return a
            if t>1-1e-9: return b
            cutcache[key]=len(vertices); point=pa+(pb-pa)*t; point[1]=plane; vertices.append(point)
        return cutcache[key]
    for i in range(0,len(indices),3):
        triangle=indices[i:i+3]
        values=[vertices[a][1]-plane for a in triangle]
        if min(values)>=-1e-9 or max(values)<=1e-9: output.extend(triangle); continue
        for sign in [-1,1]:
            polygon=[]
            for j,a in enumerate(triangle):
                b=triangle[(j+1)%3]; va,vb=vertices[a][1]-plane,vertices[b][1]-plane
                if sign*va>=-1e-9: polygon.append(a)
                if va*vb < -1e-18: polygon.append(intersection(a,b))
            polygon=list(dict.fromkeys(polygon))
            for j in range(1,len(polygon)-1): output.extend([polygon[0],polygon[j],polygon[j+1]])
    indices=output
asset={'position':np.round(vertices,5).flatten().tolist(),'index':indices}
path=Path(__file__).resolve().parents[1]/'lib/assets/athlete-body.json'
path.write_text(json.dumps(asset,separators=(',',':'))+'\n')
print(f'{len(vertices)} welded vertices; {len(indices)//3} triangles; {path.stat().st_size} bytes')
