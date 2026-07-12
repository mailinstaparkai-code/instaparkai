"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestVehicleByGuest } from "./actions";

export function RequestVehicleButton({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [requested, setRequested] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await requestVehicleByGuest(token);
      setRequested(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={pending || requested} className="w-full">
      {requested ? "Request sent…" : pending ? "Sending…" : "Request my vehicle"}
    </Button>
  );
}
