export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-white">Terms of Service</h1>

        <p className="mt-4 text-slate-300">
          These Terms of Service (“Terms”) govern your use of MarketMint (the
          “Site”). By accessing or using the Site, you agree to these Terms. If
          you do not agree, do not use the Site.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          1) What MarketMint Provides
        </h2>
        <p className="mt-3 text-slate-300">
          MarketMint provides informational tools and estimates related to
          precious metal melt value and related content. MarketMint does not buy
          or sell precious metals or jewelry and does not guarantee any payout
          from any third-party buyer.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          2) Eligibility
        </h2>
        <p className="mt-3 text-slate-300">
          You must be at least 13 years old to use the Site. If you are using
          the Site on behalf of an organization, you represent you have authority
          to bind that organization to these Terms.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          3) Acceptable Use
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
          <li>Do not misuse the Site or attempt to disrupt its operation.</li>
          <li>Do not reverse engineer, scrape excessively, or abuse the service.</li>
          <li>Do not use the Site for unlawful activity.</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-white">
          4) Estimates & Disclaimers
        </h2>
        <p className="mt-3 text-slate-300">
          All calculations and content are provided “as is” without warranties of
          any kind. Melt value and other outputs are estimates and may be
          inaccurate due to user inputs, market changes, delays, third-party
          data sources, and other factors.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          5) Third-Party Services
        </h2>
        <p className="mt-3 text-slate-300">
          The Site may integrate or reference third-party services (e.g.,
          analytics, advertising, payment processors). MarketMint is not
          responsible for third-party services and your use of them is governed
          by their terms and policies.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          6) Ads
        </h2>
        <p className="mt-3 text-slate-300">
          The Site may display advertisements. Ads may be provided by third
          parties and may use cookies or similar technologies as described in
          the Privacy Policy.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          7) Paid Features (Future)
        </h2>
        <p className="mt-3 text-slate-300">
          MarketMint may introduce paid features in the future (for example,
          exports or premium tools). Any paid feature will be described at the
          time of purchase and may be subject to additional terms.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          8) Intellectual Property
        </h2>
        <p className="mt-3 text-slate-300">
          The Site, including text, design, and code, is owned by MarketMint or
          its licensors and is protected by applicable laws. You may not copy,
          modify, distribute, or create derivative works except as permitted by
          law.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          9) Limitation of Liability
        </h2>
        <p className="mt-3 text-slate-300">
          To the maximum extent permitted by law, MarketMint and its operators
          will not be liable for any indirect, incidental, special,
          consequential, or punitive damages, or any loss of profits or data,
          arising from your use of the Site.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          10) Changes & Termination
        </h2>
        <p className="mt-3 text-slate-300">
          We may update the Site and these Terms from time to time. Continued use
          of the Site after changes means you accept the updated Terms. We may
          suspend or terminate access to the Site at any time.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          11) Governing Law
        </h2>
        <p className="mt-3 text-slate-300">
          These Terms are governed by the laws of the jurisdiction where the
          Site operator is located, without regard to conflict-of-law rules.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">Contact</h2>
        <p className="mt-3 text-slate-300">
          Questions? Reach out via the contact method you provide on the Site
          (or add a support email when ready).
        </p>

        <p className="mt-10 text-xs text-slate-500">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
      </div>
    </div>
  );
}
