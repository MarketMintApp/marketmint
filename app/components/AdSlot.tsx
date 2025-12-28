"use client";

type AdPlacement = "prices_mid" | "gold_calc_mid" | "offers_mid" | "value_mid";


/**
 * Map our internal placement names -> AdSense ad unit IDs
 * (the numeric ID you copied from AdSense for that unit)
 */
const AD_SLOTS: Partial<Record<AdPlacement, string>> = {
  prices_mid: "4718619332",
  gold_calc_mid: "YOUR_ADSENSE_UNIT_ID_HERE",
  offers_mid: "YOUR_ADSENSE_UNIT_ID_HERE",
};

export default function AdSlot({
  placement,
  className = "",
}: {
  placement: AdPlacement;
  className?: string;
}) {
  // Feature flag — ads OFF unless explicitly enabled
  const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
  if (!adsEnabled) return null;

  const slot = AD_SLOTS[placement];
  if (!slot) return null;

  /**
   * IMPORTANT:
   * We are intentionally NOT loading real AdSense <ins> tags yet.
   * This is just a placeholder “slot” so layout is stable and we can flip ads on later.
   */
  return (
    <div className={`my-6 flex justify-center ${className}`} aria-label={`ad-slot-${placement}`}>
      <div className="h-[90px] w-full max-w-3xl rounded-lg border border-slate-800 bg-slate-900/40 text-center text-xs text-slate-400 flex items-center justify-center">
        Advertisement
      </div>
    </div>
  );
}
