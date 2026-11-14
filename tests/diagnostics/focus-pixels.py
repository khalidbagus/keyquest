"""Measure real focus screenshot pixels; does not establish WCAG conformance.

Usage: python tests/diagnostics/focus-pixels.py PATH_TO_FOCUS_TEST_OUTPUT
Requires Pillow. Screenshot/device scale is derived from each CSS clip.
Raw neighbouring pixels may be anti-aliased edges. Inspect the screenshots
before treating those samples as independently authored adjacent colours.
"""
import json
import base64
import math
import re
import sys
from pathlib import Path
sys.path.insert(0, str(Path('node_modules/.tmp/keyquest-browser-investigation/python-libs').resolve()))
from PIL import Image


def luminance(rgb):
    channels = [v / 255 for v in rgb[:3]]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in channels]
    return sum(a * b for a, b in zip(linear, (0.2126, 0.7152, 0.0722)))


def contrast(first, second):
    values = sorted((luminance(first), luminance(second)))
    return (values[1] + 0.05) / (values[0] + 0.05)


root = Path(sys.argv[1])
results = []
records = []
# The JSON reporter stores body attachments as base64 rather than separate files.
report = root.with_suffix('.json')
if report.exists():
    def collect(value):
        if isinstance(value, list):
            for item in value:
                collect(item)
        elif isinstance(value, dict):
            if value.get('name', '').endswith('-focus-metrics') and 'body' in value:
                data = json.loads(base64.b64decode(value['body']))
                records.append((Path(data['before']), data))
            for item in value.values():
                if isinstance(item, (dict, list)):
                    collect(item)
    collect(json.loads(report.read_text(encoding='utf-8')))
for path in root.rglob('*.json'):
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except (ValueError, UnicodeError):
        continue
    records.append((path, data))
seen = set()
for path, data in records:
    if not isinstance(data, dict) or 'outlineWidth' not in data or data['before'] in seen:
        continue
    seen.add(data['before'])
    before = Image.open(data['before']).convert('RGB')
    after = Image.open(data['after']).convert('RGB')
    box, clip = data['box'], data['clip']
    scale = round(after.width / clip['width'])
    left, top = (box['x'] - clip['x']) * scale, (box['y'] - clip['y']) * scale
    right, bottom = left + box['width'] * scale, top + box['height'] * scale
    width, offset = data['outlineWidth'] * scale, data['outlineOffset'] * scale
    mid_x, mid_y = (left + right) / 2, (top + bottom) / 2
    probes = {
        'top': ((mid_x, top-offset-width/2), (mid_x, top-offset-width-1), (mid_x, top-offset)),
        'bottom': ((mid_x, bottom+offset+width/2), (mid_x, bottom+offset+width), (mid_x, bottom+offset-1)),
        'left': ((left-offset-width/2, mid_y), (left-offset-width-1, mid_y), (left-offset, mid_y)),
        'right': ((right+offset+width/2, mid_y), (right+offset+width, mid_y), (right+offset-1, mid_y)),
    }
    samples = []
    for edge, positions in probes.items():
        center = tuple(math.floor(v) for v in positions[0])
        axis = 1 if edge in ('top', 'bottom') else 0
        limit = after.height if axis else after.width
        expected = tuple(int(float(v)) for v in re.findall(r'[\d.]+', data['outlineColor'])[:3])
        # CSS outlines snap to device pixels. Find the actual solid-colour run
        # near the predicted edge instead of mistaking a ring pixel for its
        # neighbour when the CSS rectangle has fractional coordinates.
        runs = []
        for coordinate in range(max(0, center[axis]-6*scale), min(limit, center[axis]+7*scale)):
            point = list(center)
            point[axis] = coordinate
            if not (0 <= point[0] < after.width and 0 <= point[1] < after.height):
                continue
            pixel = after.getpixel(tuple(point))
            if max(abs(a-b) for a, b in zip(pixel, expected)) <= 3:
                if runs and runs[-1][-1] == coordinate-1:
                    runs[-1].append(coordinate)
                else:
                    runs.append([coordinate])
        if not runs:
            continue
        run = min(runs, key=lambda values: abs(sum(values)/len(values)-center[axis]))
        if run[0] < 1 or run[-1]+1 >= limit:
            continue
        positions = []
        for coordinate in (run[len(run)//2], run[0]-1, run[-1]+1):
            point = list(center)
            point[axis] = coordinate
            positions.append(tuple(point))
        ring, outer, inner = [after.getpixel(point) for point in positions]
        unfocused = before.getpixel(positions[0])
        samples.append({
            'edge': edge, 'ring': ring, 'outer': outer, 'inner': inner,
            'adjacentContrast': [round(contrast(ring, outer), 3), round(contrast(ring, inner), 3)],
            'samePixelStateContrast': round(contrast(ring, unfocused), 3),
        })
    result = {
        'test': str(path.resolve().relative_to(root.resolve())), 'control': data['name'],
        'cssOutline': data['outlineColor'], 'width': data['outlineWidth'], 'offset': data['outlineOffset'],
        'deviceScale': scale,
        'samples': samples,
        'minimumSampledAdjacentContrast': min((v for s in samples for v in s['adjacentContrast']), default=None),
        'minimumSampledStateContrast': min((s['samePixelStateContrast'] for s in samples), default=None),
    }
    results.append(result)

output = root / 'focus-pixel-results.json'
if not results:
    sys.exit('No focus metrics found. Keep the JSON reporter sidecar beside the output directory.')
output.write_text(json.dumps(results, indent=2), encoding='utf-8')
print(f'{len(results)} controls measured; details: {output}')
for result in results:
    print(f"{result['control']}: adjacent={result['minimumSampledAdjacentContrast']}, state={result['minimumSampledStateContrast']} ({result['test']})")
