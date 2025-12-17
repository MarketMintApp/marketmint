"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SellPage() {
  const [itemType, setItemType] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [weightGram, setWeightGram] = useState("");
  const [karat, setKarat] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic validation
    if (!itemType || !description || !email) {
      alert("Please fill in Item Type, Description, and Email.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("submissions").insert([
      {
        item_type: itemType,
        description,
        email,
        weight_gram: weightGram ? Number(weightGram) : null,
        karat,
        // For now we’re not uploading real images yet
        // We’ll store a placeholder so we can migrate later.
        image_urls: "photo upload coming soon",
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      alert("There was an error submitting your item. Please try again.");
    } else {
      alert("Your item was submitted! A buyer will contact you soon.");

      // Clear the form
      setItemType("");
      setDescription("");
      setEmail("");
      setWeightGram("");
      setKarat("");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-start justify-center py-16">
      <div className="w-full max-w-3xl bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-2">Get Cash Offers</h1>
        <p className="text-slate-400 mb-8">
          Provide a few details about your item. We’ll match you with trusted
          buyers who can make offers.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Type */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Item Type
            </label>
            <input
              type="text"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              placeholder="e.g., Rolex Submariner, 14K Franco Chain"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Condition, model, paperwork, box, where/when you bought it, etc."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Weight & Karat (optional, for gold) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Weight (grams)
              </label>
              <input
                type="number"
                value={weightGram}
                onChange={(e) => setWeightGram(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Karat (for gold)
              </label>
              <input
                type="text"
                value={karat}
                onChange={(e) => setKarat(e.target.value)}
                placeholder="e.g., 10K, 14K, 18K"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Where should buyers contact you?"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Submitting..." : "Submit Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
