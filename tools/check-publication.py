"""Check the exact index or committed history before public publication."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
DENIED = re.compile(
    r'(?i)(?:^|/)(?:deploy|private|private-ops|backups?|logs?|qa-artifacts|\.ssh|\.aws|\.kube|\.terraform|\.vercel|\.translation|node_modules|__pycache__|\.venv)(?:/|$)'
    r'|(?:^|/)(?:WORK_PLAN\.md|PUBLICATION\.md|VALIDATION\.md|PILOT_SLOPE\.md|narration-quality\.json|TRANSLATION_REPORT\.json|\.env(?:\..*)?|\.npmrc|\.pypirc|id_rsa|id_ed25519|cookies?(?:\..*)?|storage[-_]?state(?:\..*)?)$'
    r'|\.(?:pem|key|p12|pfx|tfstate|sqlite3?|db|dump|bak|log)$')
CONTENT = {
    'private key': rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY',
    'personal local path': rb'(?i)\b[A-Z]:[\\/]Users[\\/][^\s"<>]+|/(?:home|root)/[^\s"<>]+',
    'credential-bearing URL': rb'\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^\s/:]+:[^\s/@]+@[^\s]+',
}


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], stderr=subprocess.DEVNULL)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--staged', action='store_true', help='Inspect the exact index before committing.')
    mode.add_argument('--pre-push', action='store_true', help='Inspect every actual branch update from hook stdin.')
    mode.add_argument('--head', default=None, help='Inspect a particular committed tip.')
    args = parser.parse_args()
    if args.pre_push:
        for update in sys.stdin:
            local_ref, oid, remote_ref, remote_oid = update.split()
            if set(oid) == {'0'}:
                continue
            if not local_ref.startswith('refs/heads/') or not remote_ref.startswith('refs/heads/'):
                print('BLOCKED: non-branch refs require a separate content and annotation review.')
                return 1
            code = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--head', oid]).returncode
            if code:
                return code
        return 0
    index = args.staged
    head = git('rev-parse', '--verify', '--end-of-options', (args.head or 'HEAD') + '^{commit}').decode().strip() if not index else None
    snapshot = {}
    if index:
        for record in git('ls-files', '--stage', '-z').split(b'\0'):
            if not record:
                continue
            info, path = record.split(b'\t', 1)
            mode, oid, stage = info.decode().split()
            if stage != '0':
                raise ValueError('Resolve unmerged index entries before publishing.')
            snapshot[path.decode('utf-8')] = (mode, oid)
    else:
        for record in git('ls-tree', '-r', '-z', head).split(b'\0'):
            if not record:
                continue
            info, path = record.split(b'\t', 1)
            mode, kind, oid = info.decode().split()
            snapshot[path.decode('utf-8')] = (mode, oid)

    policy_path = '.public-files.json'
    if policy_path not in snapshot:
        raise ValueError('Public file policy is missing from the inspected tree.')
    policy = json.loads(git('cat-file', 'blob', snapshot[policy_path][1]))
    allowed = set(policy['files'])
    reviewed_binary = policy['reviewed_binary']
    problems = []
    scan_bytes = []
    if len(allowed) != len(policy['files']) or not isinstance(reviewed_binary, dict) or not set(reviewed_binary) <= allowed:
        raise ValueError('Invalid public file policy.')
    for path, (mode, oid) in snapshot.items():
        if path not in allowed:
            problems.append((path, 'not in the reviewed public file list'))
        if DENIED.search(path):
            problems.append((path, 'private/generated path'))
        if mode not in ('100644', '100755'):
            problems.append((path, 'symlink or submodule requires a separate review'))
            continue
        size = int(git('cat-file', '-s', oid))
        if size > 5 * 1024 * 1024:
            problems.append((path, 'larger than 5 MiB; explicit external review required'))
            continue
        data = git('cat-file', 'blob', oid)
        scan_bytes.append(data)
        if data.startswith(b'version https://git-lfs.github.com/spec/v1'):
            problems.append((path, 'LFS content requires a separate review'))
        if Path(path).suffix.lower() in ('.zip', '.gz', '.tar', '.7z', '.rar'):
            problems.append((path, 'archive requires an expanded-file review'))
        if b'\0' in data and path not in reviewed_binary:
            problems.append((path, 'binary file has no recorded review'))
        if path in reviewed_binary and hashlib.sha256(data).hexdigest() != reviewed_binary[path]:
            problems.append((path, 'binary content changed since its recorded review'))
        for label, pattern in CONTENT.items():
            if b'\0' in data and label != 'private key':
                continue
            if re.search(pattern, data):
                problems.append((path, label))

    if not index:
        # Diff-tree lists every historical path, including a removed file whose
        # bytes are identical to another still-public file.
        paths = subprocess.check_output(
            ['git', '-C', str(ROOT), 'diff-tree', '--stdin', '--root',
             '--no-commit-id', '--name-only', '-r', '-z', '--no-renames'],
            input=git('rev-list', head), stderr=subprocess.DEVNULL)
        for raw in set(paths.split(b'\0')):
            if raw and DENIED.search(raw.decode('utf-8')):
                problems.append((raw.decode('utf-8'), 'private path in reachable history'))

    if problems:
        for path, reason in sorted(set(problems)):
            # Never print matching file contents or secret values.
            print(f'BLOCKED {json.dumps(path, ensure_ascii=True)}: {reason}')
        return 1

    configured = subprocess.run(['git', '-C', str(ROOT), 'config', '--get',
                                 'publication.gitleaksPath'], capture_output=True)
    local_scanner = configured.stdout.decode().strip() if configured.returncode == 0 else 'gitleaks'
    scanner = shutil.which(os.environ.get('GITLEAKS_BIN', local_scanner))
    if not scanner:
        raise ValueError('Gitleaks is required. Install it or set GITLEAKS_BIN to its executable.')
    # Scan exact snapshot bytes as well as diffs, covering first commits and
    # unchanged secrets. Nothing is exported to the working tree or a report.
    scans = [([scanner, 'stdin', '--redact=100', '--no-banner', '--ignore-gitleaks-allow'], b'\n'.join(scan_bytes))]
    if not index:
        scans.append(([scanner, 'git', str(ROOT), '--redact=100', '--no-banner',
                       '--ignore-gitleaks-allow', '--log-opts=' + head], None))
    for cmd, payload in scans:
        result = subprocess.run(cmd, cwd=ROOT, input=payload, capture_output=True)
        if result.returncode:
            print('BLOCKED: secret scan found a problem or could not finish. Review locally with redaction; do not upload the report.')
            return 1 if result.returncode == 1 else 2
    print(f'Publication check passed: {len(snapshot)} reviewed files; '
          f'{"index" if index else "HEAD and reachable history"}; secret scan completed.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, KeyError, ValueError, subprocess.SubprocessError) as error:
        # Do not echo subprocess stderr, remote URLs, or potentially private data.
        message = str(error) if isinstance(error, ValueError) and not isinstance(error, json.JSONDecodeError) else 'Inspection incomplete; check the repository and policy locally.'
        print('BLOCKED: ' + message)
        sys.exit(2)
