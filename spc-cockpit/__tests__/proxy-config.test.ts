import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "../proxy";

const ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SPC_E2E"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const req = (path: string) => new NextRequest(`http://localhost:3000${path}`);

describe("proxy sans configuration Supabase", () => {
  it("répond 503 explicite sur une route protégée, sans redirection ni 500", async () => {
    const res = await proxy(req("/operations/devis"));
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("répond 503 sur la page de connexion elle-même", async () => {
    const res = await proxy(req("/login"));
    expect(res.status).toBe(503);
  });

  it("laisse passer les pages statiques publiques", async () => {
    const res = await proxy(req("/offline"));
    expect(res.status).not.toBe(503);
  });

  it("considère une clé vide comme absente", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    const res = await proxy(req("/operations"));
    expect(res.status).toBe(503);
  });
});
