"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import liff from "@line/liff";
import { supabase } from "./supabase";

type LiffContextType = {
  isReady: boolean;
  liffError: string | null;
  profile: any | null;
  userId: string | null;
};

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  liffError: null,
  profile: null,
  userId: null,
});

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("LIFF ID is missing.");

        await liff.init({ liffId });
        setIsReady(true);

        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);
          setUserId(userProfile.userId);

          // UPSERT user to Supabase
          const { error } = await supabase
            .from("users")
            .upsert(
              {
                line_user_id: userProfile.userId,
                display_name: userProfile.displayName,
                picture_url: userProfile.pictureUrl,
              },
              { onConflict: "line_user_id" }
            );

          if (error) {
            console.error("Error saving user to Supabase:", error);
          }
        } else {
          liff.login();
        }
      } catch (error: any) {
        console.error("LIFF initialization failed", error);
        setLiffError(error.message);
      }
    };

    initLiff();
  }, []);

  return (
    <LiffContext.Provider value={{ isReady, liffError, profile, userId }}>
      {children}
    </LiffContext.Provider>
  );
}

export const useLiff = () => useContext(LiffContext);
