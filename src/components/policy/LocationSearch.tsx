import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGeocode, type GeoFeature } from '@/hooks/useGeocode';

interface LocationSearchProps {
  value: string;
  onSelect: (placeName: string, lat: number, lng: number) => void;
}

export default function LocationSearch({ value, onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { results, isLoading, search, clearResults } = useGeocode();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes (e.g. from reverse geocoding)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      setHighlightedIndex(-1);
      search(val);
      setIsOpen(true);
    },
    [search]
  );

  const handleSelect = useCallback(
    (feature: GeoFeature) => {
      const [lng, lat] = feature.center;
      setQuery(feature.place_name);
      setIsOpen(false);
      clearResults();
      onSelect(feature.place_name, lat, lng);
    },
    [onSelect, clearResults]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        handleSelect(results[highlightedIndex]);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [isOpen, results, highlightedIndex, handleSelect]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search for a city or address..."
          className="pl-9 pr-9 bg-secondary/50"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
          {results.map((feature, i) => (
            <button
              key={`${feature.center[0]}-${feature.center[1]}-${i}`}
              onClick={() => handleSelect(feature)}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                i === highlightedIndex
                  ? 'bg-primary/10 text-foreground'
                  : 'text-foreground/80 hover:bg-secondary/50'
              }`}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate font-medium">{feature.place_name}</p>
                {feature.context && (
                  <p className="text-xs text-muted-foreground truncate">{feature.context}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
