"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateAppApiKey } from "../actions";
import { OrganizationAssignments } from "./organization-assignments";

// Not FormDialog: that component's "single form, close on success" shape doesn't
// fit here -- this dialog holds two independent, always-visible sections (the
// API-key form and the org-assignment list) and should stay open after either
// action succeeds, not auto-close.
export function AppManageDialog({
  appId,
  categoryKey,
  name,
  vendor,
  isConfigured,
}: {
  appId: string;
  categoryKey: string;
  name: string;
  vendor: string;
  isConfigured: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // React nullifies the synthetic event's fields once the handler's synchronous
    // portion finishes, so `event.currentTarget` reads as null after the `await`
    // below -- capture the form reference before it, not after.
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await updateAppApiKey(new FormData(form));
      form.reset();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Manage
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{vendor}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="app_id" value={appId} />
          <input type="hidden" name="category_key" value={categoryKey} />
          <label className="text-sm font-medium" htmlFor={`api-key-${appId}`}>
            API key
          </label>
          <Input
            id={`api-key-${appId}`}
            name="api_key"
            type="text"
            // Chrome/Safari largely ignore autocomplete="off" specifically on
            // type="password" fields and offer to autofill an unrelated saved
            // credential anyway (this is exactly what happened here -- a stored
            // key ended up 2 characters off from the real one). Plain text
            // inputs don't get that same password-manager override, and
            // data-1p-ignore/data-lpignore opt out of 1Password/LastPass too.
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder={
              isConfigured
                ? "Currently configured — enter a new key to replace it"
                : "No key configured yet"
            }
          />
          {error && <p className="text-sm text-status-danger">{error}</p>}
          {saved && !error && (
            <p className="text-sm text-status-success">Saved.</p>
          )}
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Saving…" : "Save key"}
          </Button>
        </form>

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-sm font-medium">Customers with access</p>
          <OrganizationAssignments appId={appId} categoryKey={categoryKey} open={open} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
