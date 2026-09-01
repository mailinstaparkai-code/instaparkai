"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fetchOrganizationAssignments, toggleAppAssignment } from "../actions";
import type { OrganizationAssignmentRow } from "@/lib/marketplace";

export function OrganizationAssignments({
  appId,
  categoryKey,
  open,
}: {
  appId: string;
  categoryKey: string;
  open: boolean;
}) {
  const [rows, setRows] = useState<OrganizationAssignmentRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    fetchOrganizationAssignments(appId)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load organizations."));
    // Only re-fetch when the dialog is (re)opened for this app -- not on every
    // toggle, which already updates local state directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appId]);

  async function handleToggle(organizationId: string, enabled: boolean) {
    setRows((prev) =>
      prev?.map((r) => (r.organization_id === organizationId ? { ...r, enabled } : r)) ?? prev
    );
    try {
      const formData = new FormData();
      formData.set("organization_id", organizationId);
      formData.set("app_id", appId);
      formData.set("category_key", categoryKey);
      formData.set("enabled", enabled.toString());
      await toggleAppAssignment(formData);
    } catch (err) {
      // Revert on failure.
      setRows((prev) =>
        prev?.map((r) => (r.organization_id === organizationId ? { ...r, enabled: !enabled } : r)) ?? prev
      );
      setError(err instanceof Error ? err.message : "Failed to update.");
    }
  }

  const filtered = rows?.filter((r) =>
    r.organization_name.toLowerCase().includes(query.toLowerCase())
  );

  if (error) return <p className="text-sm text-status-danger">{error}</p>;
  if (!rows) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Search organizations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
        {filtered?.length ? (
          filtered.map((row) => (
            <div
              key={row.organization_id}
              className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-b-0"
            >
              <span className="truncate text-sm">{row.organization_name}</span>
              <Switch
                checked={row.enabled}
                onCheckedChange={(checked) => handleToggle(row.organization_id, checked)}
              />
            </div>
          ))
        ) : (
          <p className="p-3 text-sm text-muted-foreground">No organizations found.</p>
        )}
      </div>
    </div>
  );
}
