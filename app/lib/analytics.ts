// app/lib/analytics.ts

// Prefer the standard GA4 env var, but keep a fallback for older naming.
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_GA_ID ||
  "";

// Narrow, explicit event names we care about
export type AnalyticsEventName =
  | "start_valuation_click"
  | "offers_demo_click"
  | "waitlist_submit"
  | "waitlist_submit_success"
  | "waitlist_submit_error"
  | "valuation_unlock_viewed"
  | "valuation_checkout_started"
    | "pdf_success_viewed"
  | "pdf_download_started"
  | "pdf_success_error"
  | "valuation_checkout_completed";
  

type GtagParams = Record<string, any>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Enable DebugView for localhost / vercel previews or when ?debug=1 is present.
 */
export function isDebugEnabled() {
  if (typeof window === "undefined") return false;

  const qs = new URLSearchParams(window.location.search);
  const host = window.location.hostname;

  return (
    qs.get("debug") === "1" ||
    host === "localhost" ||
    host.endsWith(".vercel.app")
  );
}

/**
 * Analytics is only "enabled" if we have BOTH:
 * - a Measurement ID (so the provider should actually load GA)
 * - window.gtag (so calls won't no-op)
 */
export function isAnalyticsEnabled() {
  return (
    typeof window !== "undefined" &&
    !!GA_MEASUREMENT_ID &&
    typeof window.gtag === "function"
  );
}

/**
 * Track a page view (SPA route change safe).
 * GA4 recommends `page_view` with `page_path`.
 */
export function trackPageView(url: string) {
  if (!isAnalyticsEnabled()) return;

  window.gtag!("event", "page_view", {
    page_location: window.location.href,
    page_path: url,
    page_title: document?.title,
    debug_mode: isDebugEnabled(),
  });
}

/**
 * Track a named conversion / interaction event.
 */
export function trackEvent(name: AnalyticsEventName, params: GtagParams = {}) {
  if (!isAnalyticsEnabled()) return;

  window.gtag!("event", name, {
    ...params,
    debug_mode: isDebugEnabled(),
  });

  // Optional visibility during validation (remove later if you want)
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.log("[trackEvent]", name, params);
  }
}
