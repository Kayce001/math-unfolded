"""Package only public assets; version the full module graph for browser caches."""
import hashlib
import json
import re
import tarfile
from pathlib import Path

root=Path(__file__).resolve().parents[1]
names=['index.html','app.js','content.js','math.js','graph.js','style.css','icon.svg','robots.txt','sitemap.xml']
originals={name:(root/'public'/name).read_bytes() for name in names}
version=hashlib.sha256(b''.join(name.encode()+originals[name] for name in sorted(names))).hexdigest()[:16]
out=root/'qa-artifacts'/'release'
out.mkdir(parents=True,exist_ok=True)
manifest={}
for name,data in originals.items():
    if name.endswith('.js'):
        text=data.decode('utf-8')
        text=re.sub(r"((?:from\s*|import\s*)['\"])(\./[^'\"?]+\.js)(['\"])",lambda m:m[1]+m[2]+'?v='+version+m[3],text)
        data=text.encode('utf-8')
    if name=='index.html':
        data=data.decode('utf-8').replace('src="app.js"',f'src="app.js?v={version}"').replace('href="style.css"',f'href="style.css?v={version}"').replace('href="icon.svg"',f'href="icon.svg?v={version}"').encode('utf-8')
    (out/name).write_bytes(data)
    manifest[name]=hashlib.sha256(data).hexdigest()
data=(root/'LICENSE').read_bytes()
(out/'LICENSE').write_bytes(data)
manifest['LICENSE']=hashlib.sha256(data).hexdigest()
(root/'qa-artifacts'/'release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
(root/'qa-artifacts'/'release-info.json').write_text(json.dumps({'assetVersion':version,'files':len(manifest)},indent=2)+'\n',encoding='utf-8')
with tarfile.open(root/'qa-artifacts'/'math-public.tar.gz','w:gz') as archive:
    for name in manifest:
        archive.add(out/name,arcname=name)
print(f'Asset version {version}; {len(manifest)} public files packaged.')
