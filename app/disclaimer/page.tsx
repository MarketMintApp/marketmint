export const metadata = {
  title: "Disclaimer",
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-white">Disclaimer</h1>

        <p className="mt-4 text-slate-300">
          MarketMint provides estimates and informational tools for educational
          purposes only. MarketMint is not a buyer, seller, broker, dealer, or
          appraiser of precious metals or jewelry, and MarketMint does not make
          any guarantees about payouts or outcomes when selling an item.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Estimates, Not Offers
        </h2>
        <p className="mt-3 text-slate-300">
          Any melt value or valuation shown is an estimate based on user inputs
          (such as metal type, purity/karat, weight, and spot price). Estimates
          are not offers, commitments, or guarantees of what you will receive
          from any buyer. Real-world offers may vary due to refining fees, buyer
          margins, item condition, design/brand premiums, market demand, and
          verification results.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Accuracy of Inputs & Pricing
        </h2>
        <p className="mt-3 text-slate-300">
          You are responsible for the accuracy of any information you enter.
          Spot prices may be delayed, estimated, cached, or provided by third
          parties. MarketMint does not guarantee that any displayed spot price
          or calculation is current, complete, or error-free.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          No Professional Advice
        </h2>
        <p className="mt-3 text-slate-300">
          MarketMint does not provide financial, investment, legal, or tax
          advice. You should consult qualified professionals for advice specific
          to your situation.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Third-Party Services & Links
        </h2>
        <p className="mt-3 text-slate-300">
          MarketMint may reference or link to third-party services (including
          analytics and advertising providers). MarketMint is not responsible
          for third-party content, availability, pricing, or policies.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Limitation of Liability
        </h2>
        <p className="mt-3 text-slate-300">
          To the maximum extent permitted by law, MarketMint and its operators
          will not be liable for any direct, indirect, incidental, consequential,
          special, or punitive damages arising from your use of the site or
          reliance on any estimates or content.
        </p>

        <p className="mt-10 text-xs text-slate-500">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
      </div>
    </div>
  );
}
