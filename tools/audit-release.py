"""Check the explicit release manifest and HTTP behavior of the public site."""
import concurrent.futures
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

BASE = 'https://math.selfworks.ai/'
manifest = json.loads(Path('qa-artifacts/release-manifest.json').read_text())
def fetch(path):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix='math-audit-',delete=False) as f:
            temporary=Path(f.name)
        proc=subprocess.run(['curl','--silent','--show-error','--location','--max-time','40',
            '--output',str(temporary),'--write-out','%{http_code}|%{content_type}',BASE+path],capture_output=True,check=True)
        status,content_type=proc.stdout.decode().split('|',1)
        data=temporary.read_bytes()
        result={'path':path,'status':int(status),'type':content_type,'sha256':hashlib.sha256(data).hexdigest()}
        if path.endswith('.html') and int(status)==200:
            result['canonical']= '<link rel="canonical" href="https://math.selfworks.ai/' in data.decode('utf-8')
        return result
    except Exception as e:
        return {'path':path,'error':str(e)}
    finally:
        if temporary:
            temporary.unlink(missing_ok=True)

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results=list(pool.map(fetch,manifest))
excluded=['.git/config','.env','package.json','tools/build-release.py','qa-artifacts/release-manifest.json','deploy/enable-https.sh']
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    private=list(pool.map(fetch,excluded))
version=json.loads(Path('qa-artifacts/release-info.json').read_text())['assetVersion']
versioned=[name+'?v='+version for name in manifest if name.endswith(('.js','.css','.svg'))]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    version_results=list(pool.map(fetch,versioned))
fail=[r for r in version_results if r.get('status')!=200 or r.get('sha256')!=manifest[r['path'].split('?')[0]]]
fail += [r for r in results if r.get('status') != 200 or r.get('canonical') is False]
fail += [r for r in private if r.get('status') not in [403,404]]
changes=[r['path'] for r in results if r.get('status')==200 and r.get('sha256') != manifest[r['path']]]
report={'httpClient':'curl with its default user agent; normal certificate verification','public':results,'versionedAssets':version_results,'excluded':private,'byteDifferences':changes,'failures':fail}
Path('qa-artifacts/public-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(results)} published files checked; {len(private)} excluded paths checked; {len(changes)} CDN byte differences; {len(fail)} failures')
if fail or changes:
    print(fail[:3])
    raise SystemExit(1)
