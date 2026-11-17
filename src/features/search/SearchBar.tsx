import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { buildHighlightSegments } from '../../lib/crossLingualSearch';
import { ResilientImage } from '../../components/ui/ResilientImage';

interface SuggestionItem {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  imageUrl: string;
  currentPrice: number;
  originalPrice: number | null;
  discountPercent: number;
}

export function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setOpen(false);
      setErrorText(null);
      return;
    }

    const handle = window.setTimeout(async () => {
      setLoading(true);
      setErrorText(null);
      try {
        const res = await apiRequest<{ ok: true; suggestions: SuggestionItem[] }>(
          `/api/products/search/suggestions?q=${encodeURIComponent(trimmed)}&limit=8`,
        );
        setSuggestions(res.suggestions);
        setActiveIndex(-1);
        setOpen(true);
      } catch (err) {
        setSuggestions([]);
        setErrorText(err instanceof Error ? err.message : 'Unable to fetch search suggestions');
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 240);

    return () => window.clearTimeout(handle);
  }, [query]);

  const submitSearch = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = query.trim();
    setOpen(false);
    if (!trimmed) {
      navigate('/shop');
      return;
    }
    navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      const target = suggestions[activeIndex];
      setOpen(false);
      navigate(`/product/${target.slug}`);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <form
        onSubmit={submitSearch}
        role="search"
        className="flex h-11 w-full items-center overflow-hidden rounded-full border border-slate-200 bg-[#F4F6FA] pl-4 pr-1 focus-within:border-[#1155EE] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1155EE]/15"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0 || errorText) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search for products... (English or বাংলা)"
          aria-label="Search for products"
          aria-expanded={open}
          aria-autocomplete="list"
          className="w-full bg-transparent text-sm text-[#0F1D3A] placeholder:text-slate-400 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setOpen(false);
            }}
            aria-label="Clear search"
            className="mr-1 rounded-full p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Submit search"
          className="flex h-9 w-12 shrink-0 items-center justify-center rounded-full bg-[#1155EE] text-white transition-colors hover:bg-[#0B44CC]"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[380px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          {loading && (
            <div className="px-4 py-3 text-xs text-slate-500">Searching catalog...</div>
          )}

          {!loading && errorText && (
            <div className="px-4 py-3 text-xs text-rose-600">{errorText}</div>
          )}

          {!loading && !errorText && suggestions.length === 0 && (
            <div className="px-4 py-4 text-center text-sm text-slate-500">
              No matching products for &ldquo;{query}&rdquo;. Press Enter to view full search.
            </div>
          )}

          {!loading &&
            suggestions.map((item, idx) => {
              const segments = buildHighlightSegments(item.name, query);
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/product/${item.slug}`);
                  }}
                  className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 ${
                    isActive ? 'bg-[#E9F0FD]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
                    <ResilientImage src={item.imageUrl} alt={item.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#0F1D3A]">
                      {segments.map((seg, sIdx) =>
                        seg.match ? (
                          <mark key={sIdx} className="rounded bg-blue-100 px-0.5 text-[#1155EE]">
                            {seg.text}
                          </mark>
                        ) : (
                          <span key={sIdx}>{seg.text}</span>
                        ),
                      )}
                    </p>
                    {item.brandName && <p className="text-xs text-slate-500">{item.brandName}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono-tabular text-sm font-bold text-[#1155EE]">
                      ৳{item.currentPrice.toLocaleString()}
                    </p>
                    {item.originalPrice && (
                      <p className="font-mono-tabular text-xs text-slate-400 line-through">
                        ৳{item.originalPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
