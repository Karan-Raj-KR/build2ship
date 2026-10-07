"""Local helper checks only: no Claude worker, fork, push or PR is executed."""
import importlib.util
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import Mock

# HTTP is mocked; these checks need only Python's standard library.
sys.modules['httpx'] = Mock()
spec = importlib.util.spec_from_file_location('runner', Path(__file__).resolve().parents[1] / 'public/full-auto/runner.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
api = runner.Api('http://example.invalid', 'fixture', 'fixture')
api._r = Mock(side_effect=RuntimeError('cancelled'))
try:
    api.event('opening', 'publication claim')
    raise AssertionError('Opening must stop on a server rejection')
except RuntimeError:
    pass
api.event('working', 'best effort progress')
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root, text=True)
    git('init', '-q')
    git('config', 'user.name', 'Disposable QA')
    git('config', 'user.email', 'qa@example.invalid')
    (root/'tracked').write_text('original\n')
    git('add', '.')
    git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture')
    (root/'tracked').write_text('staged\n')
    git('add', '.')
    (root/'untracked').write_text('new\n')
    diff, files = runner.collect_diff(root)
    assert '+staged' in diff and '+new' in diff
    assert set(files) == {'tracked', 'untracked'}
    git('add', '-A')
    assert git('diff', '--cached', '--binary', 'HEAD') == diff
print('PASS runner publication claim fails closed; staged and new files included in review (no worker executed)')
