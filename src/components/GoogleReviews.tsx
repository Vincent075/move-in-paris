"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

type Review = {
  author: string;
  photo: string | null;
  rating: number;
  relative: string;
  text: string;
};

type ApiResponse = {
  reviews: Review[];
  averageRating: number | null;
  totalReviews: number | null;
  error?: string;
};

export default function GoogleReviews({ fallback }: { fallback?: React.ReactNode }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgErr, setImgErr] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/google-reviews");
        const json = (await res.json()) as ApiResponse;
        if (alive) setData(json);
      } catch {
        if (alive) setData({ reviews: [], averageRating: null, totalReviews: null, error: "fetch_failed" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // While loading, show a light skeleton so the section doesn't collapse then jump.
  if (loading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-8 bg-blanc-chaud border border-gris-clair/40 animate-pulse">
            <div className="h-4 w-24 bg-gris-clair mb-4" />
            <div className="h-3 w-full bg-gris-clair mb-2" />
            <div className="h-3 w-full bg-gris-clair mb-2" />
            <div className="h-3 w-3/4 bg-gris-clair mb-6" />
            <div className="h-px w-full bg-gris-clair mb-3" />
            <div className="h-3 w-20 bg-gris-clair" />
          </div>
        ))}
      </div>
    );
  }

  // Soft-fail: if the API returned no reviews (key missing, network, filter empty),
  // render the caller-provided fallback (hardcoded testimonials typically).
  if (!data || data.reviews.length === 0) {
    return <>{fallback ?? null}</>;
  }

  return (
    <>
      {data.averageRating != null && data.totalReviews != null && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-blanc border border-gris-clair/40 px-6 py-3">
            <span className="font-serif text-3xl text-noir">{data.averageRating.toFixed(1)}</span>
            <div className="flex text-gold text-lg">
              {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
            </div>
            <div className="text-left text-xs text-gris">
              <div className="uppercase tracking-[0.15em] text-gold">Google Reviews</div>
              <div>{data.totalReviews} avis vérifiés</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {data.reviews.slice(0, 6).map((r, i) => (
          <motion.article
            key={`${r.author}-${i}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="p-8 bg-blanc-chaud border border-gris-clair/40"
          >
            <div className="flex items-center gap-3 mb-4">
              {r.photo && !imgErr.has(r.photo) ? (
                <Image
                  src={r.photo}
                  alt={r.author}
                  width={40} height={40}
                  unoptimized
                  className="w-10 h-10 rounded-full object-cover"
                  onError={() => setImgErr((prev) => new Set(prev).add(r.photo!))}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gold/20 text-gold flex items-center justify-center font-serif">
                  {r.author.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-serif text-noir text-sm truncate">{r.author}</div>
                <div className="text-[11px] text-gris">{r.relative}</div>
              </div>
            </div>
            <div className="flex text-gold mb-3">
              {"★★★★★".split("").map((s, idx) => <span key={idx}>{s}</span>)}
            </div>
            <p className="text-noir font-light leading-relaxed italic text-sm">
              &ldquo;{r.text}&rdquo;
            </p>
          </motion.article>
        ))}
      </div>
    </>
  );
}
