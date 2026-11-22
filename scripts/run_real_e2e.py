"""E2E real opt-in: inicia FastAPI de teste e nunca imprime credenciais/relatórios brutos."""

import asyncio
import json
import os
import signal
import socket
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from tempfile import TemporaryDirectory

import httpx
from dotenv import dotenv_values

from app.core.config import Settings

ROOT = Path(__file__).resolve().parents[1]
ACCOUNT_FIELDS = tuple(
    f"NEOX_TEST_{kind}_{field}" for kind in ("ADMIN", "NONADMIN") for field in ("EMAIL", "PASSWORD")
)


async def stop_process_group(process):
    # A sessão foi criada por este runner; não sinaliza processos fora desse grupo.
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        await asyncio.wait_for(process.communicate(), 5)
    except TimeoutError:
        pass
    finally:
        # EOF/pai encerrado não prova grupo vazio: filhos podem usar DEVNULL e ignorar TERM.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    try:
        await asyncio.wait_for(process.communicate(), 5)
    except TimeoutError as exc:
        raise RuntimeError("O grupo de teste não encerrou dentro do limite.") from exc


@asynccontextmanager
async def running_test_server(settings):
    """Processo descartável; só o próprio processo é encerrado, nunca servidores do usuário."""
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    origin = f"http://127.0.0.1:{port}"
    env = dict(os.environ)
    for name in Settings.model_fields:
        value = getattr(settings, name)
        if value is not None:
            if hasattr(value, "get_secret_value"):
                value = value.get_secret_value()
            env[name.upper()] = json.dumps(value) if isinstance(value, (list, bool)) else str(value)
    env["ALLOWED_ORIGIN"] = origin
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
        "--workers",
        "1",
        "--no-proxy-headers",
        cwd=ROOT,
        env=env,
        start_new_session=True,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    try:
        async with asyncio.timeout(20), httpx.AsyncClient(timeout=1) as client:
            while True:
                if process.returncode is not None:
                    raise RuntimeError("FastAPI de teste não iniciou; revisar configuração local.")
                try:
                    if (await client.get(origin + "/admin/login")).status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                await asyncio.sleep(0.1)
        yield origin
    finally:
        await stop_process_group(process)


def configuration():
    # O opt-in vem do processo, não de um arquivo .env esquecido com valor antigo.
    if os.environ.get("RUN_REAL_INTEGRATION") != "1":
        raise ValueError("Exige RUN_REAL_INTEGRATION=1 e autorização prévia das escritas de teste.")
    settings = Settings()
    if not (
        settings.app_env == "test"
        and settings.test_connections_enabled
        and settings.mongodb_database == "neox_drop_test"
        and settings.cookie_secret
    ):
        raise ValueError("Exige ambiente de teste, banco neox_drop_test e COOKIE_SECRET.")
    if not all(
        (
            settings.supabase_url,
            settings.supabase_key,
            settings.supabase_secret_key,
            settings.mongodb_uri,
            settings.upstash_redis_rest_url,
            settings.upstash_redis_rest_token,
        )
    ):
        raise ValueError("Três bancos e contato backend precisam estar configurados.")
    local = dotenv_values(ROOT / ".env")
    accounts = {name: os.environ.get(name, local.get(name)) for name in ACCOUNT_FIELDS}
    if not all(accounts.values()):
        raise ValueError("Configure as duas contas NEOX_TEST_ADMIN/NONADMIN no .env privado.")
    return settings, accounts


def failure_locations(report):
    failures = []
    stack = list(report.get("suites", []))
    while stack:
        suite = stack.pop()
        stack.extend(suite.get("suites", []))
        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                for result in test.get("results", []):
                    if result.get("status") not in {"passed", "skipped"}:
                        failures.append(
                            {
                                "test": spec.get("title"),
                                "status": result.get("status"),
                                "file": spec.get("file"),
                                "line": spec.get("line"),
                            }
                        )
    return failures


async def run(settings, accounts):
    with TemporaryDirectory(prefix="neox-real-e2e-") as directory:
        report = Path(directory) / "report.json"
        async with running_test_server(settings) as origin:
            env = {
                **os.environ,
                **accounts,
                "NEOX_FASTAPI_URL": origin,
                "NEOX_REAL_E2E": "1",
                "PLAYWRIGHT_JSON_OUTPUT_FILE": str(report),
            }
            child = await asyncio.create_subprocess_exec(
                "pnpm",
                "exec",
                "playwright",
                "test",
                "--project=desktop",
                "--workers=1",
                "--reporter=json",
                "--output",
                directory + "/artifacts",
                start_new_session=True,
                cwd=ROOT,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            completed = False
            try:
                async with asyncio.timeout(180):
                    await child.communicate()
                completed = True
            finally:
                if not completed:
                    await stop_process_group(child)

        if report.exists():
            data = json.loads(report.read_text())
            stats = data.get("stats", {})
            print(json.dumps({"failures": failure_locations(data)}))
            print(
                json.dumps(
                    {
                        "real_e2e": {
                            k: stats.get(k)
                            for k in ("expected", "unexpected", "skipped", "duration")
                        }
                    }
                )
            )
        else:
            print("Runner não gerou relatório; saída bruta omitida para proteger credenciais.")
        return child.returncode


def main():
    try:
        settings, accounts = configuration()
    except Exception:
        print("Recusado: confira opt-in, ambiente e as quatro variáveis NEOX_TEST no .env privado.")
        return 2
    try:
        return asyncio.run(run(settings, accounts))
    except Exception:
        print("E2E real falhou; detalhes sensíveis não foram enviados ao terminal.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
