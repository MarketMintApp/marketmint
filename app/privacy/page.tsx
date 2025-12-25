export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>

        <p className="mt-4 text-slate-300">
          MarketMint respects your privacy. This Privacy Policy explains what
          information we collect, how we use it, and the choices you have when
          you use our website.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Information We Collect
        </h2>
        <p className="mt-3 text-slate-300">
          <span className="font-semibold text-slate-200">Information you provide:</span>{" "}
          MarketMint may collect information you voluntarily submit (for example,
          if you contact us). MarketMint does not require you to create an account
          to use the basic calculator features.
        </p>
        <p className="mt-3 text-slate-300">
          <span className="font-semibold text-slate-200">Usage & device data:</span>{" "}
          We may collect anonymous or pseudonymous usage data such as pages
          visited, interactions, approximate location (city-level), device and
          browser type, and referral source. This helps us understand what’s
          working and improve the product.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Cookies, Analytics & Advertising
        </h2>
        <p className="mt-3 text-slate-300">
          MarketMint may use cookies or similar technologies for:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
          <li>Site functionality and basic performance.</li>
          <li>Analytics (e.g., Google Analytics) to understand traffic and usage.</li>
          <li>
            Advertising (e.g., Google AdSense), which may use cookies to show ads
            and measure performance.
          </li>
        </ul>
        <p className="mt-3 text-slate-300">
          Third-party vendors, including Google, may use cookies to serve ads
          based on prior visits to this and/or other websites. You can control
          ad personalization through Google’s ad settings and your browser
          controls.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          How We Use Information
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
          <li>Operate and improve MarketMint.</li>
          <li>Analyze traffic, engagement, and feature usage.</li>
          <li>Detect abuse, protect security, and prevent fraud.</li>
          <li>Measure and improve advertising performance (if enabled).</li>
          <li>Respond to inquiries you send us.</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Sharing of Information
        </h2>
        <p className="mt-3 text-slate-300">
          We do not sell your personal information. We may share limited
          information with service providers that help us operate the site
          (analytics, hosting, advertising). These providers process data under
          their own policies and/or agreements.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Data Retention
        </h2>
        <p className="mt-3 text-slate-300">
          We retain analytics and log data for as long as needed to operate and
          improve MarketMint, unless a shorter retention period is configured.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Your Choices
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
          <li>You can block cookies in your browser settings.</li>
          <li>You can use browser tools to clear stored site data.</li>
          <li>You can adjust ad personalization settings with Google.</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Children’s Privacy
        </h2>
        <p className="mt-3 text-slate-300">
          MarketMint is not intended for children under 13. We do not knowingly
          collect personal information from children under 13.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Changes to This Policy
        </h2>
        <p className="mt-3 text-slate-300">
          We may update this Privacy Policy from time to time. Updates will be
          posted on this page with a revised “Last updated” date.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">Contact</h2>
        <p className="mt-3 text-slate-300">
          If you have questions about this policy, contact us via the site
          contact method you provide (or add a support email when ready).
        </p>

        <p className="mt-10 text-xs text-slate-500">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
      </div>
    </div>
  );
}
