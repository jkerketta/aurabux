"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";

// ─── Types ───────────────────────────────────────────────────────────

interface SearchResult {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
}

// ─── Inner component (needs Suspense for useSearchParams) ─────────────

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || ""
  );
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Sync search query to URL params (skip initial render to avoid replace loop)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const trimmed = searchQuery.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    const newQuery = params.toString();
    const newUrl = newQuery
      ? `/dashboard/search?${newQuery}`
      : "/dashboard/search";

    router.replace(newUrl, { scroll: false });
  }, [searchQuery, router, searchParams]);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) {
          setSearchResults([]);
          setSearchError("Failed to search stocks");
          setSearchLoading(false);
          return;
        }
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
        setSearchError("Failed to search stocks. Try again.");
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-black">
        Search Stocks
      </h1>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          placeholder="Search stocks..."
          className="h-12 pl-10 text-base focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
        />
        {searchLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Error message */}
      {searchError && (
        <p className="mb-4 text-sm text-[#FF4444]">{searchError}</p>
      )}

      {/* Search Results */}
      <AnimatePresence mode="popLayout">
        {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
          <motion.p
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8 text-center text-sm text-muted-foreground"
          >
            No stocks found for &ldquo;{searchQuery}&rdquo;
          </motion.p>
        )}

        {searchResults.map((result: SearchResult, index: number) => (
          <motion.div
            key={`${result.symbol}-${result.displaySymbol}-${index}`}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className="mb-2 cursor-pointer transition-shadow hover:shadow-md hover:bg-neutral-50"
              onClick={() =>
                router.push(`/dashboard/stock/${result.symbol}`)
              }
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-black">
                      {result.displaySymbol || result.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {result.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Wrapper with Suspense boundary ───────────────────────────────────

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl">
          <Skeleton className="h-9 w-48 mb-6" />
          <div className="relative mb-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
