"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginParkingAdmin } from "./actions";

export default function ParkingAdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await loginParkingAdmin(new FormData(event.currentTarget));

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    router.replace(isMobile ? "/parking-admin/m/dashboard" : "/parking-admin/dashboard");
    router.refresh();
  }

  return (
    <div className="pa-scope flex min-h-dvh">
      <div className="relative hidden flex-[1.15] overflow-hidden lg:block">
        <Image
          src="/img/hero-login-web.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(200deg, rgba(8,15,30,0.06) 0%, rgba(8,15,30,0.30) 55%, rgba(8,15,30,0.78) 100%)",
          }}
        />
        <div className="absolute left-9 top-9 rounded-2xl bg-white/95 px-4 py-2.5 shadow-[0_10px_28px_rgba(8,15,30,0.28)] backdrop-blur">
          <Image src="/img/logo-instaparkai.png" alt="InstaParkAi" width={140} height={30} className="h-[30px] w-auto" />
        </div>
        <div className="absolute bottom-10 left-9 right-9 flex flex-col gap-4">
          <h1 className="max-w-[520px] text-[2.5rem] font-bold leading-[1.15] tracking-tight text-white">
            The front door of your property, digitized.
          </h1>
          <p className="max-w-[460px] text-base leading-relaxed text-white/78">
            Live queues, dispatch, tariffs and guest messaging — one console for every valet site you run.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-[420px] flex flex-col gap-6">
          <div>
            <h2 className="text-[1.9rem] font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">Sign in to your admin console</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" autoComplete="username" required className="h-[54px] rounded-2xl" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="h-[54px] rounded-2xl pr-9"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                >
                  {passwordVisible ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-status-danger">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-[54px] w-full rounded-2xl bg-gradient-to-br from-[var(--brand-blue-light)] to-[var(--brand-blue)] text-[15px] font-semibold shadow-[0_12px_26px_rgba(37,99,235,0.30)]"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Trouble signing in? Contact your super admin.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
