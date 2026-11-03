"""Export approved workbench narration as self-contained public lesson assets.

Only the generated voice track and lesson text/times are exported. Reference
recordings, voice configuration and workbench paths stay outside the website.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

project = Path(sys.argv[1]).resolve()
root = Path(__file__).resolve().parents[1]
output = project / 'output'
quality = json.loads((output / 'quality_report.json').read_text(encoding='utf-8'))
if quality['status'] != 'PASS':
    raise SystemExit('Narration quality gate did not pass')
timeline = json.loads((output / 'sentence_timeline.json').read_text(encoding='utf-8'))
views = ['walk', 'motion', 'motion', 'triangle', 'wide', 'formula']
sentences = [dict(id=key, start=row['starts_at'], end=row['ends_at'],
                  audioEnd=round(row['starts_at']+row['clip_seconds'], 6),
                  beat=row['beat'], text=row['display_text'])
             for key, row in timeline['per_sentence'].items()]
sections = []
manifest = json.loads((project / 'work' / 'manifest.json').read_text(encoding='utf-8'))
for i, summary in enumerate(manifest['beat_summary']):
    rows = [s for s in sentences if s['beat'] == summary['beat']]
    sections.append(dict(id=summary['beat'], start=0 if i == 0 else rows[0]['start'],
                         end=rows[-1]['end'], title=summary['title'],
                         text=''.join(s['text'] for s in rows), view=views[i], k=2))
if len(sections) != 6 or len(sentences) != 21:
    raise SystemExit('Unexpected lesson script: review the six-section cue mapping')
payload = dict(duration=timeline['total'], sentences=sentences, beats=sections,
               sourceWavSha256=quality['summary']['sha256'])
(root / 'public' / 'slope-timing.js').write_text(
    '// Generated from measured narration clips; no estimated speech durations.\n'
    + 'export const narrationTiming = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n',
    encoding='utf-8')
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                '-i', str(output / 'narration.wav'), '-map_metadata', '-1',
                '-codec:a', 'libmp3lame', '-b:a', '96k', '-ar', '24000', '-ac', '1',
                str(root / 'public' / 'slope-narration.mp3')], check=True)
media = root / 'public' / 'slope-narration.mp3'
print(json.dumps(dict(duration=payload['duration'], sentences=len(sentences),
                      mediaBytes=media.stat().st_size,
                      mediaSha256=hashlib.sha256(media.read_bytes()).hexdigest())))
