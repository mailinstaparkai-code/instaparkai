"use client";

import { useState } from "react";
import { Images } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getTicketPhotoUrls } from "./actions";

type Photo = { label: string; stage: string; url: string };

export function PhotosButton({ ticketId, count }: { ticketId: string; count: number }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(open: boolean) {
    if (!open || photos) return;
    setLoading(true);
    setPhotos(await getTicketPhotoUrls(ticketId));
    setLoading(false);
  }

  if (count === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button className="inline-flex items-center gap-1 text-xs text-brand-orange hover:underline">
            <Images className="size-3.5" />
            {count} photo{count === 1 ? "" : "s"}
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vehicle photos</DialogTitle>
        </DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        <div className="grid grid-cols-2 gap-3">
          {photos?.map((photo, i) => (
            <a key={i} href={photo.url} target="_blank" rel="noreferrer" className="block">
              <img
                src={photo.url}
                alt={`${photo.stage} ${photo.label}`}
                className="aspect-square w-full rounded-md object-cover"
              />
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {photo.stage} · {photo.label}
              </p>
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
