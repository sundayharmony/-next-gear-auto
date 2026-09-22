import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureNamedDualRole,
  namedDualRoleAlreadyApplied,
  namedDualRolePatch,
  type DualRoleDb,
  type NamedDualRoleRow,
} from "../src/lib/admin/ensure-named-dual-role";

const NOW = new Date("2026-09-22T12:00:00.000Z");

function row(partial: Partial<NamedDualRoleRow> = {}): NamedDualRoleRow {
  return {
    id: "cust-1",
    role: "customer",
    manager_access_enabled: null,
    manager_access_granted_at: null,
    manager_access_revoked_at: null,
    owner_portal_enabled: false,
    ...partial,
  };
}

function db(options: {
  rows?: NamedDualRoleRow[];
  loadError?: { code?: string; message?: string } | null;
  updateError?: { code?: string; message?: string } | null;
  vehicleCount?: number;
}): { client: DualRoleDb; updates: Record<string, unknown>[] } {
  const updates: Record<string, unknown>[] = [];
  const client: DualRoleDb = {
    from(table: string) {
      return {
        select() {
          return {
            ilike() {
              return {
                limit: async () => ({
                  data: options.rows ?? [],
                  error: options.loadError ?? null,
                }),
              };
            },
            eq: async () => ({
              data: null,
              error: null,
              count: table === "vehicles" ? (options.vehicleCount ?? 0) : null,
            }),
          };
        },
        update(values: Record<string, unknown>) {
          updates.push(values);
          return {
            eq: async () => ({ data: null, error: options.updateError ?? null }),
          };
        },
      };
    },
  };
  return { client, updates };
}

test("patch keeps an existing manager grant timestamp and enables owner portal", () => {
  const patch = namedDualRolePatch(
    row({ manager_access_granted_at: "2026-01-01T00:00:00.000Z" }),
    NOW.toISOString()
  );
  assert.equal(patch.role, "manager");
  assert.equal(patch.manager_access_enabled, true);
  assert.equal(patch.manager_access_granted_at, "2026-01-01T00:00:00.000Z");
  assert.equal(patch.manager_access_revoked_at, null);
  assert.equal(patch.owner_portal_enabled, true);
});

test("already applied when manager access is on and owner portal is enabled", () => {
  assert.equal(
    namedDualRoleAlreadyApplied(
      row({
        role: "manager",
        manager_access_enabled: true,
        owner_portal_enabled: true,
      })
    ),
    true
  );
  assert.equal(namedDualRoleAlreadyApplied(row({ role: "manager", owner_portal_enabled: true })), true);
  assert.equal(
    namedDualRoleAlreadyApplied(
      row({
        role: "manager",
        manager_access_enabled: true,
        manager_access_revoked_at: "2026-02-01T00:00:00.000Z",
        owner_portal_enabled: true,
      })
    ),
    false
  );
});

test("grants manager and owner access and reports vehicle count", async () => {
  const { client, updates } = db({ rows: [row()], vehicleCount: 2 });
  const result = await ensureNamedDualRole(client, "maccesar.inc@gmail.com", NOW);
  assert.equal(result.ok, true);
  assert.equal(result.updated, true);
  assert.equal(result.role, "manager");
  assert.equal(result.ownerPortalEnabled, true);
  assert.equal(result.vehicleCount, 2);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].role, "manager");
  assert.equal(updates[0].owner_portal_enabled, true);
});

test("does not write when the account is already both roles", async () => {
  const { client, updates } = db({
    rows: [
      row({
        role: "manager",
        manager_access_enabled: true,
        owner_portal_enabled: true,
      }),
    ],
    vehicleCount: 1,
  });
  const result = await ensureNamedDualRole(client, "maccesar.inc@gmail.com", NOW);
  assert.equal(result.ok, true);
  assert.equal(result.updated, false);
  assert.equal(updates.length, 0);
  assert.equal(result.vehicleCount, 1);
});

test("reports a missing account without writing", async () => {
  const { client, updates } = db({ rows: [] });
  const result = await ensureNamedDualRole(client, "maccesar.inc@gmail.com", NOW);
  assert.equal(result.ok, false);
  assert.equal(result.found, false);
  assert.equal(updates.length, 0);
});

test("reports a missing owner portal column", async () => {
  const { client, updates } = db({
    loadError: { code: "42703", message: 'column "owner_portal_enabled" does not exist' },
  });
  const result = await ensureNamedDualRole(client, "maccesar.inc@gmail.com", NOW);
  assert.equal(result.needsOwnerPortalColumn, true);
  assert.equal(result.ok, false);
  assert.equal(updates.length, 0);
});
