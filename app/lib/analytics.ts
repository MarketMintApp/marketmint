// app/lib/analytics.ts

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID || "";


// Narrow, explicit event names we care about in C10
export type AnalyticsEventName =
  | "start_valuation_click"
  | "offers_demo_click"
  | "waitlist_submit"
  | "waitlist_submit_success"
  | "waitlist_submit_error";

type GtagParams = Record<string, any>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function isAnalyticsEnabled() {
  return typeof window !== "undefined" && !!GA_MEASUREMENT_ID && !!window.gtag;
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
  });
}

/**
 * Track a named conversion / interaction event.
 */
export function trackEvent(name: AnalyticsEventName, params: GtagParams = {}) {
  if (!isAnalyticsEnabled()) return;

  window.gtag!("event", name, {
    ...params,
  });
}
