// app/components/AnalyticsProvider.tsx
"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_MEASUREMENT_ID, trackPageView } from "../lib/analytics";

/**
 * Loads GA + tracks page views on App Router navigation.
 * Safe in dev (no-op if no Measurement ID).
 *
 * Also supports marking "internal" traffic by setting:
 *   localStorage.setItem("mm_internal", "true")
 *
 * When enabled, we set a GA4 user property:
 *   internal_user: "alden"
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track pageviews on route changes
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    trackPageView(url);
  }, [pathname, searchParams]);

  // If no ID, don’t inject anything
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      {/* Load gtag.js */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />

      {/* Configure GA + internal marker */}
      <Script id="ga4-init" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;

    gtag('js', new Date());

    // Base GA config
    gtag('config', '${GA_MEASUREMENT_ID}', {
      send_page_view: false,
      debug_mode: true
    });

    // ---- MarketMint internal traffic marker ----
    try {
      const isInternal = localStorage.getItem("mm_internal") === "true";
      console.log("MM internal flag:", isInternal);

      if (isInternal) {
        gtag('set', 'user_properties', {
          internal_user: 'alden'
        });
      } else {
        gtag('set', 'user_properties', {
          internal_user: undefined
        });
      }
    } catch (e) {}
  `}
</Script>

    </>
  );
}
