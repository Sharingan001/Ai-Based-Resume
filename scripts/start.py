"""Local Windows launcher; standard-library only. Invoked by start.bat."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / '.runtime'
FRONTEND = ROOT / 'frontend'
PYTHON = ROOT / '.venv' / 'Scripts' / 'python.exe'
HIDDEN = getattr(subprocess, 'CREATE_NO_WINDOW', 0)


def endpoint(url):
    headers = {}
    if os.getenv('NEXUS_API_TOKEN') and '/api/' in url:
        headers['Authorization'] = 'Bearer ' + os.environ['NEXUS_API_TOKEN']
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=4) as response:
        return json.load(response)


def api_ready():
    try:
        health = endpoint('http://127.0.0.1:8000/api/health')
        return health.get('status') == 'ok' and health.get('data_loaded') and health.get('version') == '3.3.0' and health.get('ollama_model') == os.getenv('OLLAMA_MODEL', 'qwen3:4b-instruct')
    except Exception:
        return False


def web_ready():
    try:
        with urllib.request.urlopen('http://127.0.0.1:5173/', timeout=4) as response:
            return response.status == 200 and '<title>Nexus HR</title>' in response.read().decode()
    except Exception:
        return False


def port_busy(port):
    with socket.socket() as connection:
        connection.settimeout(1)
        return connection.connect_ex(('127.0.0.1', port)) == 0


def run(arguments, cwd=ROOT):
    # npm.cmd needs cmd.exe; other commands receive an argument array directly.
    if str(arguments[0]).lower().endswith('.cmd'):
        subprocess.run(subprocess.list2cmdline(list(map(str, arguments))), shell=True, cwd=cwd, check=True)
        return
    subprocess.run(list(map(str, arguments)), cwd=cwd, check=True)


def install_if_changed(manifest, stamp_name, command, cwd=ROOT, required=None):
    stamp = RUNTIME / stamp_name
    digest = hashlib.sha256(manifest.read_bytes()).hexdigest()
    if not stamp.exists() or stamp.read_text().strip() != digest or (required and not required.exists()):
        run(command, cwd)
        stamp.write_text(digest)


def launch(arguments, cwd, name, owned):
    with (RUNTIME / f'{name}.stdout.log').open('w') as out, (RUNTIME / f'{name}.stderr.log').open('w') as err:
        process = subprocess.Popen(list(map(str, arguments)), cwd=cwd, stdout=out, stderr=err, creationflags=HIDDEN)
    owned.append(process)
    return process


def wait_ready(probe, process, name):
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        if probe():
            print(f'[OK] {name} ready', flush=True)
            return
        if process.poll() is not None:
            raise RuntimeError(f'{name} exited. Inspect logs in {RUNTIME}')
        time.sleep(1)
    raise RuntimeError(f'{name} startup timed out. Inspect logs in {RUNTIME}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--no-browser', '-NoBrowser', action='store_true')
    parser.add_argument('--check-only', '-CheckOnly', action='store_true')
    parser.add_argument('--build-cpp', '-BuildCpp', action='store_true')
    args = parser.parse_args()
    owned = []
    try:
        print('Nexus HR - local launcher', flush=True)
        node = shutil.which('node')
        npm = shutil.which('npm.cmd')
        if not node or not npm:
            raise RuntimeError('Node.js/npm not found. Install Node 22.12+ or newer.')
        version = subprocess.check_output([node, '--version'], text=True).strip()
        major, minor = map(int, version.lstrip('v').split('.')[:2])
        if not ((major == 20 and minor >= 19) or (major == 22 and minor >= 12) or major > 22):
            raise RuntimeError(f'Unsupported Node {version}; use Node 20.19+, 22.12+, or newer.')
        ollama = shutil.which('ollama') or str(Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs/Ollama/ollama.exe')
        if not Path(ollama).is_file():
            raise RuntimeError('Ollama executable not found.')
        model = os.environ.setdefault('OLLAMA_MODEL', 'qwen3:4b-instruct')
        base = os.environ.setdefault('OLLAMA_URL', 'http://localhost:11434').rstrip('/')

        def ollama_ready():
            try:
                return bool(endpoint(base + '/api/version').get('version'))
            except Exception:
                return False

        def check_model():
            names = {item['name'] for item in endpoint(base + '/api/tags').get('models', [])}
            if model not in names:
                raise RuntimeError(f'Model {model} is missing. Run: ollama pull {model}')

        if args.check_only:
            print(f'Node: {version}\nProject Python environment: {PYTHON.exists()}\nBackend ready: {api_ready()}\nFrontend ready: {web_ready()}')
            check_model()
            print(f'[OK] Ollama model installed: {model}')
            return 0
        RUNTIME.mkdir(exist_ok=True)
        if not PYTHON.exists():
            run([sys.executable, '-m', 'venv', ROOT / '.venv'])
        install_if_changed(ROOT / 'api/requirements.txt', 'python-requirements.hash', [PYTHON, '-m', 'pip', 'install', '-r', ROOT / 'api/requirements.txt'], required=ROOT / '.venv/Lib/site-packages/fastapi/__init__.py')
        vite = FRONTEND / 'node_modules/vite/bin/vite.js'
        if web_ready():
            print('[OK] Frontend is running; dependency installation deferred to avoid locked Windows files.')
        else:
            if port_busy(5173):
                raise RuntimeError('Port 5173 is occupied; stop its service before installing frontend dependencies.')
            install_if_changed(FRONTEND / 'package-lock.json', 'node-lock.hash', [npm, 'ci'], FRONTEND, vite)
        # Dataset regeneration can take hours; never run it implicitly.
        if not ollama_ready():
            if base not in ('http://localhost:11434', 'http://127.0.0.1:11434'):
                raise RuntimeError(f'Configured Ollama server is unreachable: {base}')
            if port_busy(11434):
                raise RuntimeError('Port 11434 is occupied by an unresponsive service.')
            process = launch([ollama, 'serve'], ROOT, 'ollama', owned)
            wait_ready(ollama_ready, process, 'Ollama')
        check_model()
        print(f'[OK] Ollama model: {model}', flush=True)
        if api_ready():
            print('[OK] Reusing existing API')
        else:
            if port_busy(8000):
                raise RuntimeError('Port 8000 is busy but Nexus HR API is not ready.')
            process = launch([PYTHON, '-m', 'uvicorn', 'api.main:app', '--host', '127.0.0.1', '--port', '8000'], ROOT, 'api', owned)
            wait_ready(api_ready, process, 'Backend')
        if web_ready():
            print('[OK] Reusing existing frontend')
        else:
            if port_busy(5173):
                raise RuntimeError('Port 5173 is occupied by another service.')
            process = launch([node, vite, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], FRONTEND, 'frontend', owned)
            wait_ready(web_ready, process, 'Frontend')
        if args.build_cpp:
            compiler = shutil.which('g++') or r'C:\MinGW\bin\g++.exe'
            if not Path(compiler).is_file():
                raise RuntimeError('g++ not found. Add its bin directory to PATH.')
            os.environ['PATH'] = str(Path(compiler).parent) + os.pathsep + os.environ['PATH']
            output = ROOT / 'cpp/build/nexus_score.exe'
            output.parent.mkdir(exist_ok=True)
            run([compiler, '-std=c++17', '-Wall', '-Wextra', '-Werror', '-O2', '-static', ROOT / 'cpp/main.cpp', '-o', output])
            run([output, '80', '100', '50', '75'])
        print(f'[READY] http://127.0.0.1:5173\n[READY] API docs: http://127.0.0.1:8000/docs\nLogs: {RUNTIME}')
        if not args.no_browser:
            webbrowser.open('http://127.0.0.1:5173')
        return 0
    except Exception as error:
        for process in reversed(owned):
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=10)
        print(f'[ERROR] {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
