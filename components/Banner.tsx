"use client";

import { BRAND_NAME, BRAND_SUITE, BRAND_TAGLINE } from "@/lib/brand";
import SupportButton from "@/components/SupportButton";
import AuthWidget from "@/components/AuthWidget";

export default function Banner() {
  return (
    <div className="bg-brand text-white">
      <div className="max-w-3xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-xl font-black tracking-tight leading-none">🎓 {BRAND_NAME}</p>
          <p className="text-xs text-white/70 mt-1">{BRAND_SUITE}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 min-w-0">
          <AuthWidget />
          <SupportButton variant="solid" />
        </div>
      </div>
      <div className="bg-brand-dark/40 text-center text-xs text-white/80 py-1.5 px-4">{BRAND_TAGLINE}</div>
    </div>
  );
}
