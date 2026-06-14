"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import liff from "@line/liff";

type LiffContextType = {
  isReady: boolean;
  liffError: string | null;
  profile: any | null;
  userId: string | null;
  needsLineOpen: boolean;
  openInLineUrl: string | null;
};

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  liffError: null,
  profile: null,
  userId: null,
  needsLineOpen: false,
  openInLineUrl: null,
});

function isDevBypassEnabled() {
  if (process.env.NEXT_PUBLIC_LIFF_DEV_BYPASS === "true") return true;
  if (process.env.NEXT_PUBLIC_LIFF_DEV_BYPASS === "false") return false;
  return process.env.NODE_ENV === "development";
}

async function syncUser(profile: { userId: string; displayName?: string; pictureUrl?: string }) {
  try {
    await fetch("/api/users/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        line_user_id: profile.userId,
        display_name: profile.displayName || "LIFF User",
        picture_url: profile.pictureUrl || null,
      }),
    });
  } catch (syncErr) {
    console.error("Error syncing user:", syncErr);
  }
}

function OpenInLineScreen({ url }: { url: string }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#FFF9F0", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, textAlign: "center",
    }}>
      <img src="/image/logosy2.svg" alt="Song-Yang" style={{ width: 88, height: 88, marginBottom: 20 }} />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#3E2723", margin: "0 0 8px" }}>Song-Yang</h1>
      <p style={{ fontSize: 14, color: "#795548", lineHeight: 1.7, margin: "0 0 24px", maxWidth: 280 }}>
        แอปนี้ต้องเปิดผ่าน LINE<br />กรุณาเปิดจากแชท LINE หรือสแกน QR
      </p>
      <a
        href={url}
        style={{
          display: "inline-block", padding: "14px 28px", background: "#06C755",
          color: "#fff", borderRadius: 50, fontWeight: 700, fontSize: 15,
          textDecoration: "none",
        }}
      >
        เปิดใน LINE
      </a>
      <p style={{ fontSize: 12, color: "#A1887F", marginTop: 20 }}>
        Preview บน browser: ตั้ง <code>NEXT_PUBLIC_LIFF_DEV_BYPASS=true</code> ใน Vercel
      </p>
    </div>
  );
}

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [needsLineOpen, setNeedsLineOpen] = useState(false);
  const [openInLineUrl, setOpenInLineUrl] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("LIFF ID is missing.");

        await liff.init({ liffId });

        const liffEntryUrl = `https://liff.line.me/${liffId}${window.location.pathname}${window.location.search}`;

        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);
          setUserId(userProfile.userId);
          setIsReady(true);
          await syncUser(userProfile);
          return;
        }

        // ใน LINE app → login ปกติ
        if (liff.isInClient()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        // เปิดใน browser ภายนอก (Vercel preview / localhost)
        if (isDevBypassEnabled()) {
          const devUserId = process.env.NEXT_PUBLIC_LIFF_DEV_USER_ID || "U_DEV_PREVIEW_USER";
          const devProfile = {
            userId: devUserId,
            displayName: "Dev Preview",
            pictureUrl: undefined as string | undefined,
          };
          setProfile(devProfile);
          setUserId(devUserId);
          setIsReady(true);
          await syncUser(devProfile);
          return;
        }

        // Production browser โดยไม่มี bypass → แสดงหน้าเปิดใน LINE
        setOpenInLineUrl(liffEntryUrl);
        setNeedsLineOpen(true);
        setIsReady(true);
      } catch (error: any) {
        console.error("LIFF initialization failed", error);
        setLiffError(error.message);
        setIsReady(true);
      }
    };

    initLiff();
  }, []);

  if (needsLineOpen && openInLineUrl) {
    return <OpenInLineScreen url={openInLineUrl} />;
  }

  return (
    <LiffContext.Provider value={{ isReady, liffError, profile, userId, needsLineOpen, openInLineUrl }}>
      {children}
    </LiffContext.Provider>
  );
}

export const useLiff = () => useContext(LiffContext);
