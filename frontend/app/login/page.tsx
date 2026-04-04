"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect /login → /auth for backwards compatibility
export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/auth"); }, [router]);
  return null;
}
