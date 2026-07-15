"use client";

import { useState } from "react";

const OPTIONS = [
  { value: "in", label: "In" },
  { value: "out", label: "Out" },
  { value: "leave", label: "Leave" },
  { value: "break", label: "Break" },
];

export function DailyStatusSelect({
  operatorId,
  value,
  action,
}: {
  operatorId: string;
  value: string | null;
  action: (formData: FormData) => Promise<void> | void;
}) {
  const [pending, setPending] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const status = event.target.value;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("operator_id", operatorId);
      formData.set("status", status);
      await action(formData);
    } finally {
      setPending(false);
    }
  }

  return (
    <select
      key={value ?? "unset"}
      defaultValue={value ?? ""}
      disabled={pending}
      onChange={handleChange}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
    >
      {!value && (
        <option value="" disabled>
          Not marked
        </option>
      )}
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
