import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const dirname = path.dirname(fileURLToPath(import.meta.url));
// frontend/src/api/__tests__/ -> repository root
const repoRoot = path.resolve(dirname, "..", "..", "..", "..");
const pythonPath = join(repoRoot, ".venv", "Scripts", "python.exe");

const STARTUP_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 200;
const TEARDOWN_TIMEOUT_MS = 5_000;

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        server.close(() => resolve(address.port));
      } else {
        server.close();
        reject(new Error("no free port"));
      }
    });
  });
}

function killTree(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  try {
    spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } catch {
    child.kill();
  }
}

function onceExit(child: ChildProcess): Promise<number | null> {
  return new Promise((resolve) => child.once("exit", (code) => resolve(code)));
}

function bootstrapDatabaseCommand(dbFile: string): string[] {
  // Build the production schema through the real backend/database/init_database.py
  // and seed the frozen data/seeds abilities, so the bounded real uvicorn call runs
  // against production-shaped data instead of a hand-written schema copy.
  return [
    "-c",
    [
      "import sqlite3, sys",
      "from pathlib import Path",
      "from backend.database.init_database import init_database",
      "init_database(Path(sys.argv[1]))",
      "conn = sqlite3.connect(sys.argv[1])",
      "from backend.database.seed_database import populate_abilities",
      "populate_abilities(conn.cursor(), conn)",
      "conn.commit()",
      "conn.close()",
    ].join("; "),
    dbFile,
  ];
}

async function waitForReady(baseUrl: string): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/openapi.json`);
      if (response.ok) return;
    } catch {
      // uvicorn not accepting connections yet
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`uvicorn did not become ready within ${STARTUP_TIMEOUT_MS}ms`);
}

it("real generated getAbilities() through the central module returns the typed reference data", async () => {
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const previousProcessBaseUrl = process.env.VITE_API_BASE_URL;
  const previousImportMetaBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const workDir = mkdtempSync(join(tmpdir(), "dnd-api-test-"));
  const dbFile = join(workDir, "abilities.db");

  const bootstrap = spawn(pythonPath, bootstrapDatabaseCommand(dbFile), {
    cwd: repoRoot,
    stdio: "ignore",
    windowsHide: true,
  });
  const bootstrapCode = await onceExit(bootstrap);
  expect(bootstrapCode).toBe(0);

  const child = spawn(
    pythonPath,
    [
      "-m",
      "uvicorn",
      "backend.app.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--log-level",
      "warning",
    ],
    {
      cwd: repoRoot,
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, DND_DATABASE_PATH: dbFile },
    },
  );

  try {
    await waitForReady(baseUrl);

    // Configure the central module for the ephemeral test server before it
    // is imported, so the real call runs through the handwritten central
    // configuration exactly as production would.
    process.env.VITE_API_BASE_URL = baseUrl;
    import.meta.env.VITE_API_BASE_URL = baseUrl;
    const { getAbilities, getHealth } = await import("../client");

    const health = await getHealth();
    expect(health).toEqual({ status: "ok" });

    const abilities = await getAbilities();

    expect(Array.isArray(abilities)).toBe(true);
    // GET /api/abilities is scoped to the six base ability scores, in name order.
    expect(abilities).toHaveLength(6);
    expect(abilities.map((ability) => ability.code)).toEqual([
      "cha",
      "con",
      "dex",
      "int",
      "str",
      "wis",
    ]);
  } finally {
    if (previousProcessBaseUrl === undefined) {
      delete process.env.VITE_API_BASE_URL;
    } else {
      process.env.VITE_API_BASE_URL = previousProcessBaseUrl;
    }
    import.meta.env.VITE_API_BASE_URL = previousImportMetaBaseUrl;
    killTree(child);
    const exited = await Promise.race([
      new Promise<boolean>((resolve) => child.once("exit", () => resolve(true))),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), TEARDOWN_TIMEOUT_MS)),
    ]);
    if (!exited) killTree(child);
    rmSync(workDir, { recursive: true, force: true });
  }
}, 30_000);
