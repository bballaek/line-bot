"use client";

import { LiffProvider } from "@/lib/liff-provider";
import { ReactNode } from "react";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <LiffProvider>{children}</LiffProvider>;
}
