"""Renders the hero pictures for the from-scratch stills (site/_prototypes/): Studio, Reed and Silk.

Needs Blender as a Python module: Python 3.11 and `pip install bpy==5.0.1`. CPU only, about 2 to 5 minutes per picture.
   python scene.py <scene> <out.png> <scale> <samples>
   scenes: studio-today studio-workout reed-today reed-workout silk-today silk-workout
           (reed also takes todayb / workoutb: the cobalt and rose theme;
            studio-todaymask gives a white-on-black cut-out of the barbell, so type can sit behind it)
   scale 2.5 gives 960 x 2080 px. Then: python tojpg.py out.png out.jpg 90 [contrast] [saturation]
The plate numerals use Inter Display Medium from /usr/share/fonts/opentype/inter/.
"""
import bpy, sys, math
from mathutils import Vector

scene_name, out, scale, samples = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4])
W, H = 384, 832

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.samples = samples
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 10
sc.cycles.transmission_bounces = 10
sc.cycles.glossy_bounces = 6
sc.cycles.caustics_reflective = False
sc.cycles.caustics_refractive = False
sc.render.resolution_x = int(W * scale)
sc.render.resolution_y = int(H * scale)
sc.render.resolution_percentage = 100
sc.render.threads_mode = 'AUTO'
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_depth = '16'
sc.render.filepath = out
sc.view_settings.view_transform = 'AgX'
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']


def mat(name, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return m


def smooth(o, angle=40):
    for p in o.data.polygons: p.use_smooth = True
    try:
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle)); o.select_set(False)
    except Exception as e:
        print('autosmooth', e)


def lathe(name, profile, m, steps=160):
    """profile: list of (radius, axial) points; spun around local Z."""
    me = bpy.data.meshes.new(name)
    verts = [(r, 0, z) for r, z in profile]
    edges = [(i, i + 1) for i in range(len(verts) - 1)] + [(len(verts) - 1, 0)]
    me.from_pydata(verts, edges, [])
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    s = o.modifiers.new('screw', 'SCREW'); s.steps = steps; s.render_steps = steps; s.use_merge_vertices = True
    s.use_normal_calculate = True
    b = o.modifiers.new('bevel', 'BEVEL'); b.width = 0.0025; b.segments = 4; b.limit_method = 'ANGLE'
    o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.clear(); o.data = me2
    smooth(o, 35)
    return o


def plate_profile(r, t, hole=0.0258):
    h = t / 2; d = h * 0.45; hub = max(r * 0.3, hole + 0.02); rim = r - max(0.022, r * 0.12)
    return [(hole, -h), (hub, -h), (hub + 0.006, -d), (rim - 0.006, -d), (rim, -h), (r - 0.004, -h), (r, -h + 0.004),
            (r, h - 0.004), (r - 0.004, h), (rim, h), (rim - 0.006, d), (hub + 0.006, d), (hub, h), (hole, h)]


def cyl_profile(r, z0, z1, inner=0.0):
    return [(inner, z0), (r, z0), (r, z1), (inner, z1)] if inner else [(0.0001, z0), (r, z0), (r, z1), (0.0001, z1)]


def barbell(mats, plates, origin=(0, 0, 0.225), labels=None):
    """Axis along X. plates: list of (radius, thickness, material) from the inside out."""
    parent = bpy.data.objects.new('barbell', None); sc.collection.objects.link(parent)
    parts = []
    parts.append(lathe('shaft', cyl_profile(0.0142, -0.66, 0.66), mats['steel'], 64))
    for side in (1, -1):
        parts.append(lathe('collar', cyl_profile(0.039, side * 0.625, side * 0.655), mats['chrome'], 64))
        parts.append(lathe('sleeve', cyl_profile(0.025, side * 0.655, side * 1.1), mats['steel'], 64))
        x = 0.657
        for r, t, m in plates:
            p = lathe('plate', plate_profile(r, t), m)
            p.location.z = side * (x + t / 2)
            parts.append(p)
            if side == 1 and labels and r > 0.09:
                # painted weight numeral on the outer face, like a calibrated plate
                lab, rad, size, ink = labels.pop(0)
                cu = bpy.data.curves.new('num', 'FONT'); cu.body = lab; cu.size = size; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
                cu.extrude = 0.0004; cu.font = bpy.data.fonts.load('/usr/share/fonts/opentype/inter/InterDisplay-Medium.otf')
                to = bpy.data.objects.new('num', cu); sc.collection.objects.link(to); to.data.materials.append(mats[ink])
                on_rim = rad > r - 0.03
                to.location = (-rad, 0, x + (t if on_rim else t / 2 + t * 0.225) + 0.0003)
                to.rotation_euler = (0, 0, math.radians(90))
                parts.append(to)
            x += t + 0.0015
        parts.append(lathe('lock', cyl_profile(0.041, side * (x + 0.002), side * (x + 0.04), inner=0.0255), mats['chrome'], 64))
    for p in parts:
        p.parent = parent
    parent.rotation_euler = (0, math.radians(90), 0)   # local Z -> world X
    parent.location = origin
    return parent


def camera(loc, target, lens=70, ortho=None, dof=None):
    cd = bpy.data.cameras.new('cam'); c = bpy.data.objects.new('cam', cd); sc.collection.objects.link(c)
    c.location = loc
    d = Vector(target) - Vector(loc)
    c.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cd.lens = lens; cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 36
    if ortho:
        cd.type = 'ORTHO'; cd.ortho_scale = ortho
    if dof:
        cd.dof.use_dof = True; cd.dof.focus_distance = dof[0]; cd.dof.aperture_fstop = dof[1]
    sc.camera = c
    return c


def plane(name, size, loc, rot, m):
    bpy.ops.mesh.primitive_plane_add(size=size, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); return o


def box(name, dims, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = dims; o.data.materials.append(m); return o


def sun(direction, strength, angle_deg, color=(1, 0.96, 0.9)):
    ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = strength; ld.angle = math.radians(angle_deg); ld.color = color
    o = bpy.data.objects.new('sun', ld); sc.collection.objects.link(o)
    o.rotation_euler = Vector(direction).to_track_quat('-Z', 'Y').to_euler()
    return o


def window_gobo(target, direction, dist=4.2, w=1.5, h=2.3, m=None):
    """A wall with a window hole, square to the sun, so light lands as window panes."""
    d = Vector(direction).normalized()
    centre = Vector(target) - d * dist
    q = d.to_track_quat('-Z', 'Y')
    root = bpy.data.objects.new('gobo', None); sc.collection.objects.link(root)
    root.location = centre; root.rotation_euler = q.to_euler()
    big = 14
    pieces = [((big, big, 0.01), (-(w / 2 + big / 2), 0, 0)), ((big, big, 0.01), ((w / 2 + big / 2), 0, 0)),
              ((w, big, 0.01), (0, (h / 2 + big / 2), 0)), ((w, big, 0.01), (0, -(h / 2 + big / 2), 0)),
              ((0.07, h, 0.01), (0, 0, 0)), ((w, 0.07, 0.01), (0, h / 6, 0)), ((w, 0.07, 0.01), (0, -h / 6, 0))]
    for dims, loc in pieces:
        b = box('g', dims, (0, 0, 0), m); b.parent = root; b.location = loc
        b.visible_camera = False; b.visible_glossy = False; b.visible_diffuse = False
    return root


# ---------------------------------------------------------------- STUDIO
def cove(alpha, depth=2.6, radius=1.3, m=None):
    """Seamless floor-to-wall sweep. Local +y is 'away from camera'; rotated by alpha about Z."""
    me = bpy.data.meshes.new('cove'); verts = []; faces = []
    prof = [(-30, 0.0), (depth - radius, 0.0)]
    for i in range(1, 25):
        a = math.pi / 2 * i / 24
        prof.append((depth - radius + math.sin(a) * radius, radius - math.cos(a) * radius))
    prof.append((depth, 30))
    for y, z in prof:
        verts += [(-30, y, z), (30, y, z)]
    for i in range(len(prof) - 1):
        faces.append((i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2))
    me.from_pydata(verts, [], faces)
    o = bpy.data.objects.new('cove', me); sc.collection.objects.link(o); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    o.rotation_euler = (0, 0, alpha)
    return o


def studio(view):
    mask = view.endswith('mask'); view = view.replace('mask', '')
    sc.view_settings.exposure = 0.78
    room = mat('room', **{'Base Color': (0.83, 0.775, 0.70, 1), 'Roughness': 0.7})
    mats = {
        'steel': mat('steel', **{'Base Color': (0.62, 0.63, 0.64, 1), 'Metallic': 1.0, 'Roughness': 0.28}),
        'chrome': mat('chrome', **{'Base Color': (0.82, 0.82, 0.82, 1), 'Metallic': 1.0, 'Roughness': 0.1}),
    }
    graphite = mat('graphite', **{'Base Color': (0.022, 0.024, 0.027, 1), 'Roughness': 0.4})
    cobalt = mat('cobalt', **{'Base Color': (0.0015, 0.010, 0.165, 1), 'Roughness': 0.42, 'Coat Weight': 0.15, 'Coat Roughness': 0.3})
    small = mat('small', **{'Base Color': (0.80, 0.79, 0.76, 1), 'Roughness': 0.45})   # the 2.5 kg change plate, painted white
    mats['ink'] = mat('ink', **{'Base Color': (0.03, 0.03, 0.035, 1), 'Roughness': 0.5})
    mats['paint'] = mat('paint', **{'Base Color': (0.72, 0.72, 0.70, 1), 'Roughness': 0.5})
    barbell(mats, [(0.225, 0.026, cobalt), (0.1625, 0.024, graphite), (0.096, 0.012, small)], origin=(0, 0, 0.225), labels=[('20', 0.186, 0.026, 'paint'), ('10', 0.112, 0.036, 'paint'), ('2.5', 0.070, 0.021, 'ink')])
    bg.inputs[0].default_value = (0.86, 0.90, 0.97, 1); bg.inputs[1].default_value = 0.5
    black = mat('black', **{'Base Color': (0, 0, 0, 1), 'Roughness': 1})
    up = Vector((0, 0, 1))
    if view == 'today':
        phi = math.radians(62); R = 3.8
        f = Vector((-math.sin(phi), math.cos(phi), 0)); r = f.cross(up)
        cove(phi, depth=2.4, radius=1.5, m=room)
        d = (r * 0.80 + f * 0.42 - up * 0.42)
        sun(d, 7.5, 0.9, (1, 0.93, 0.84))
        window_gobo(Vector((0, 0, 0)) + r * 0.55 + f * 0.5, d, dist=5, w=1.25, h=1.9, m=black)
        camera(tuple(-f * R + up * 1.5 + r * 0.02), tuple(Vector((0, 0, 0.06)) + r * 0.02), lens=64, dof=(4.0, 8))
    else:
        end = Vector((0.72, 0, 0.225))
        phi = math.radians(54); R = 1.5           # 0 = side-on, 90 = straight down the bar
        f = Vector((-math.sin(phi), math.cos(phi), 0)); r = f.cross(up)
        cove(phi, depth=3.2, radius=1.5, m=room)
        d = (r * 0.72 + f * 0.5 - up * 0.48)
        sun(d, 7.5, 0.9, (1, 0.93, 0.84))
        window_gobo(end + r * 0.25 + f * 0.1 - up * 0.225, d, dist=5, w=1.25, h=1.9, m=black)
        camera(tuple(end - f * R + up * 0.34), tuple(end + up * 0.077 - r * 0.02), lens=50, dof=(1.52, 8))
    if mask:
        # the barbell white, everything else black: an alpha for layering type behind the bar
        def flat(name, v):
            m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
            o_ = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission')
            e.inputs['Color'].default_value = (v, v, v, 1); nt.links.new(e.outputs[0], o_.inputs['Surface']); return m
        white, dark = flat('white', 1), flat('dark', 0)
        for o in bpy.data.objects:
            if o.type == 'LIGHT': o.data.energy = 0
            elif o.type in ('MESH', 'FONT'):
                o.data.materials.clear(); o.data.materials.append(white if o.parent and o.parent.name == 'barbell' else dark)
        bg.inputs[1].default_value = 0.0
        sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = 0


def glass(name, tint=(1, 1, 1, 1), rough=0.28):
    return mat(name, **{'Base Color': tint, 'Transmission Weight': 1.0, 'Roughness': rough, 'IOR': 1.46})


# ---------------------------------------------------------------- REED
def reed(view):
    # a wall of reeded glass, colour light behind it
    g = glass('reed', (1, 1, 1, 1), 0.035)
    pitch = 0.0185; n = 32; hgt = 1.2
    me = bpy.data.meshes.new('flutes'); verts = []; faces = []
    seg = 14
    for i in range(n):
        x0 = (i - n / 2) * pitch
        base = len(verts)
        for j in range(seg + 1):
            a = math.pi * j / seg
            x = x0 + pitch / 2 - math.cos(a) * pitch / 2
            y = -math.sin(a) * pitch * 0.42
            verts += [(x, y, -hgt / 2), (x, y, hgt / 2)]
        for j in range(seg):
            a = base + j * 2
            faces.append((a, a + 2, a + 3, a + 1))
    # flat back
    xa, xb = -n / 2 * pitch, n / 2 * pitch
    b = len(verts); verts += [(xa, 0.004, -hgt / 2), (xb, 0.004, -hgt / 2), (xb, 0.004, hgt / 2), (xa, 0.004, hgt / 2)]
    faces.append((b, b + 1, b + 2, b + 3))
    me.from_pydata(verts, [], faces)
    o = bpy.data.objects.new('flutes', me); sc.collection.objects.link(o); o.data.materials.append(g)
    for p in o.data.polygons: p.use_smooth = True
    bg.inputs[0].default_value = (0.0, 0.0, 0.0, 1); bg.inputs[1].default_value = 0.0

    def blob(loc, size, col, strength):
        m = bpy.data.materials.new('b'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        out_ = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission')
        tc = nt.nodes.new('ShaderNodeTexCoord'); gr = nt.nodes.new('ShaderNodeTexGradient'); gr.gradient_type = 'SPHERICAL'
        mapn = nt.nodes.new('ShaderNodeMapping'); mapn.inputs['Location'].default_value = (-1, -1, 0); mapn.inputs['Scale'].default_value = (2, 2, 2)
        pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 1.6
        nt.links.new(tc.outputs['UV'], mapn.inputs[0]); nt.links.new(mapn.outputs[0], gr.inputs[0])
        nt.links.new(gr.outputs['Fac'], pw.inputs[0])
        tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader')
        e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = strength
        nt.links.new(pw.outputs[0], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(e.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out_.inputs['Surface'])
        plane('blob', size, loc, (math.radians(90), 0, 0), m)

    def base(col, strength=1.0):
        m = bpy.data.materials.new('base'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        out_ = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission')
        e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = strength
        nt.links.new(e.outputs[0], out_.inputs['Surface'])
        plane('base', 6, (0, 0.9, 0), (math.radians(90), 0, 0), m)

    pal = {
        'today': ((0.0, 0.035, 0.028, 1), [((0.15, 0.42, 0.30), 1.0, (1.0, 0.90, 0.70, 1), 3.2), ((-0.16, 0.5, 0.0), 1.05, (0.0, 0.62, 0.36, 1), 2.2), ((0.06, 0.6, -0.42), 1.1, (0.0, 0.40, 0.42, 1), 1.4)]),
        'workout': ((0.0, 0.022, 0.022, 1), [((-0.15, 0.42, 0.27), 0.95, (0.0, 0.50, 0.36, 1), 1.05), ((0.15, 0.5, -0.08), 1.0, (0.62, 0.95, 0.22, 1), 1.0), ((-0.1, 0.6, -0.46), 1.05, (0.0, 0.32, 0.45, 1), 0.9)]),
        'todayb': ((0.012, 0.045, 0.20, 1), [((0.16, 0.42, 0.30), 1.0, (1.0, 0.86, 0.72, 1), 3.4), ((-0.18, 0.5, 0.02), 1.05, (0.10, 0.55, 1.0, 1), 2.2), ((0.05, 0.6, -0.42), 1.1, (0.02, 0.75, 0.70, 1), 1.3)]),
        'workoutb': ((0.02, 0.02, 0.16, 1), [((-0.14, 0.42, 0.26), 0.95, (0.16, 0.42, 1.0, 1), 2.6), ((0.16, 0.5, -0.10), 1.0, (1.0, 0.32, 0.42, 1), 2.4), ((-0.1, 0.6, -0.48), 1.05, (0.35, 0.10, 0.85, 1), 1.2)]),
    }[view]
    base(pal[0], 1.0)
    for loc, size, col, st in pal[1]:
        blob(loc, size, col, st)
    camera((0, -2, 0), (0, 0, 0), ortho=1.0)
    sc.camera.data.sensor_fit = 'VERTICAL'


# ---------------------------------------------------------------- SILK
def silk(view):
    # a wall of satin folds in a jewel colour, lit evenly from two sides: no black, no single glow
    import numpy as np
    nx, nz = 300, 640
    X, Zc = np.meshgrid(np.linspace(-0.3, 0.3, nx), np.linspace(-0.62, 0.62, nz))
    a = math.radians(33 if view == 'today' else 28)
    U = X * math.cos(a) + Zc * math.sin(a); V = -X * math.sin(a) + Zc * math.cos(a)
    k = 1.3 if view == 'today' else 1.25
    D = (0.040 * np.sin(13 * k * U + 1.1 * np.sin(5 * V + (2.6 if view == 'today' else 0.4)))
         + 0.010 * np.sin(27 * k * U + 1.4 * np.sin(8 * V + 1.7) + 0.9))
    verts = np.stack([X, -D, Zc], axis=-1).reshape(-1, 3)
    idx = np.arange(nx * nz).reshape(nz, nx)
    faces = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], axis=-1).reshape(-1, 4)
    me = bpy.data.meshes.new('silk'); me.from_pydata(verts.tolist(), [], faces.tolist())
    o = bpy.data.objects.new('silk', me); sc.collection.objects.link(o)
    for p in o.data.polygons: p.use_smooth = True
    pal = {
        'today': ((0.022, 0.030, 0.34, 1), (0.45, 0.55, 1.0, 1), (0.78, 0.82, 1.0), 36, (0.45, 0.60, 1.0), 9, (0.03, 0.04, 0.24, 1)),
        'workout': ((0.19, 0.010, 0.20, 1), (1.0, 0.45, 0.85, 1), (1.0, 0.66, 0.86), 20, (0.60, 0.42, 1.0), 7, (0.09, 0.02, 0.18, 1)),
    }[view]
    o.data.materials.append(mat('satin', **{'Base Color': pal[0], 'Roughness': 0.44, 'Sheen Weight': 0.2, 'Sheen Roughness': 0.4, 'Sheen Tint': pal[1], 'Specular IOR Level': 0.6}))

    def area(loc, col, watts, size):
        ld = bpy.data.lights.new('a', 'AREA'); ld.energy = watts; ld.color = col; ld.shape = 'SQUARE'; ld.size = size
        lo = bpy.data.objects.new('a', ld); sc.collection.objects.link(lo); lo.location = loc
        lo.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

    area((-0.75, -0.55, -0.9), pal[2], pal[3], 1.2)      # key, low and from the left
    area((0.85, -0.7, 0.75), pal[4], pal[5], 1.4)         # fill, high and from the right
    bg.inputs[0].default_value = pal[6]; bg.inputs[1].default_value = 0.35
    camera((0, -2, 0), (0, 0, 0), ortho=1.0)
    sc.camera.data.sensor_fit = 'VERTICAL'


kind, view = scene_name.split('-')
{'studio': studio, 'reed': reed, 'silk': silk}[kind](view)
bpy.ops.render.render(write_still=True)
print('done', out)
