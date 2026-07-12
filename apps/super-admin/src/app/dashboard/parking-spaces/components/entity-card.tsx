"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

export function EntityCard({
  href,
  icon,
  title,
  meta,
  badges = [],
  stats = [],
  deleteAction,
  deleteHiddenFields,
  deleteConsequences = [],
}: {
  href: string;
  icon: ReactNode;
  title: string;
  meta?: string;
  badges?: { label: string; className: string }[];
  stats?: { label: string; value: string | number }[];
  deleteAction: (formData: FormData) => void;
  deleteHiddenFields: Record<string, string>;
  deleteConsequences?: string[];
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="glass-card relative p-4">
      <Link href={href} aria-label={title} className="absolute inset-0 z-0 rounded-3xl" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-5">
            {icon}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{title}</p>
            {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative z-10 rounded-lg p-1.5 hover:bg-muted">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {stats.length > 0 && (
        <div className="mt-4 flex gap-4 border-t border-border pt-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-numeric text-lg">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={title}
        consequences={deleteConsequences}
        action={deleteAction}
        hiddenFields={deleteHiddenFields}
      />
    </div>
  );
}
