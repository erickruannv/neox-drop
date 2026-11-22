"""Verifica guardas e reinício HTTP local, sem habilitar bancos ou sessões externas."""

from unittest.mock import AsyncMock

import httpx
import pytest

from app.core.config import Settings
from scripts import run_real_e2e


def test_no_opt_in_refuses_before_loading_configuration_or_starting_process(monkeypatch, capsys):
    monkeypatch.delenv("RUN_REAL_INTEGRATION", raising=False)
    mocked = AsyncMock()
    monkeypatch.setattr(run_real_e2e, "run", mocked)
    assert run_real_e2e.main() == 2
    mocked.assert_not_called()
    assert "Recusado" in capsys.readouterr().out


def test_runner_never_prints_raw_error_or_account_password(monkeypatch, capsys):
    monkeypatch.setattr(run_real_e2e, "configuration", lambda: (None, {}))
    monkeypatch.setattr(
        run_real_e2e, "run", AsyncMock(side_effect=RuntimeError("private-test-value"))
    )
    assert run_real_e2e.main() == 1
    assert "private-test-value" not in capsys.readouterr().out


async def test_real_http_process_restart_without_database_access():
    settings = Settings(_env_file=None, cookie_secret="local-process-test-" * 4)
    async with httpx.AsyncClient(timeout=3) as client:
        for _ in range(2):
            async with run_real_e2e.running_test_server(settings) as origin:
                response = await client.get(origin + "/admin/login")
                assert response.status_code == 200
                assert "autenticação administrativa aguarda" in response.text
                assert (await client.get(origin + "/api/admin/products")).status_code == 401
            with pytest.raises(httpx.ConnectError):
                await client.get(origin + "/admin/login")


def test_report_reveals_failure_location_without_error_payload():
    import json

    report = {
        "suites": [
            {
                "specs": [
                    {
                        "title": "admin workflow",
                        "file": "real/storefront.spec.js",
                        "line": 20,
                        "tests": [
                            {
                                "results": [
                                    {"status": "failed", "error": {"message": "private-test-value"}}
                                ]
                            }
                        ],
                    }
                ]
            }
        ]
    }
    summary = run_real_e2e.failure_locations(report)
    assert summary[0]["line"] == 20
    assert summary[0]["status"] == "failed"
    assert "private-test-value" not in json.dumps(summary)


async def test_timeout_cleanup_kills_owned_descendant_holding_output_pipe():
    import asyncio
    import os
    import sys

    # O pai encerra no TERM; o filho ignora TERM e mantém o pipe aberto até SIGKILL.
    child_code = (
        "import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);"
        "print('child-ready',flush=True);time.sleep(30)"
    )
    code = (
        f"import subprocess,sys,time;subprocess.Popen([sys.executable,'-c',{child_code!r}]);"
        "print('parent-ready',flush=True);time.sleep(30)"
    )
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-c",
        code,
        start_new_session=True,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        assert os.getpgid(process.pid) == process.pid
        async with asyncio.timeout(5):
            lines = {await process.stdout.readline(), await process.stdout.readline()}
            assert lines == {b"parent-ready\n", b"child-ready\n"}
        await run_real_e2e.stop_process_group(process)
        assert process.returncode is not None
    finally:
        if process.returncode is None:
            await run_real_e2e.stop_process_group(process)


async def test_cleanup_kills_owned_descendant_even_without_inherited_output_pipe():
    import asyncio
    import os
    import signal
    import sys

    child_code = (
        "import os,signal,sys,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);"
        "os.write(int(sys.argv[1]),b'r');time.sleep(30)"
    )
    code = (
        "import os,subprocess,sys,time;r,w=os.pipe();"
        f"p=subprocess.Popen([sys.executable,'-c',{child_code!r},str(w)],pass_fds=(w,),"
        "stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);"
        "os.close(w);os.read(r,1);os.close(r);print(p.pid,flush=True);time.sleep(30)"
    )
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-c",
        code,
        start_new_session=True,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        async with asyncio.timeout(5):
            child_pid = int(await process.stdout.readline())
        await run_real_e2e.stop_process_group(process)
        status = await asyncio.create_subprocess_exec(
            "ps",
            "-p",
            str(child_pid),
            "-o",
            "state=",
            stdout=asyncio.subprocess.PIPE,
        )
        state, _ = await status.communicate()
        assert not state.strip() or state.strip().startswith(b"Z")
    finally:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        await process.wait()
