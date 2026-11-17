import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import { ResilientImage } from '../../ui/ResilientImage';

const BUNDLED_PRESETS = [
  { label: 'Smart Tech Hero', url: '/src/assets/images/hero_smart_tech_1794832024388.jpg' },
  { label: 'MacBook Air M4', url: '/src/assets/images/product_laptop_1794832026646.jpg' },
  { label: 'Galaxy S25 Ultra', url: '/src/assets/images/product_smartphone_1794832025637.jpg' },
  { label: 'Studio Headphones', url: '/src/assets/images/promo_headphones_1794832024152.jpg' },
  { label: 'Smart Watch Pro', url: '/src/assets/images/promo_smartwatch_1794832026084.jpg' },
  { label: 'Sneakers Drop', url: '/src/assets/images/promo_sneakers_1794832025309.jpg' },
  { label: 'Travel Backpack', url: '/src/assets/images/product_backpack_1794832026092.jpg' },
  { label: 'Cotton Hoodie', url: '/src/assets/images/product_hoodie_1794832027034.jpg' },
];

interface NavigationMediaFieldProps {
  label: string;
  value: string;
  onChange: (url: string, publicId?: string) => void;
  helperText?: string;
}

export function NavigationMediaField({
  label,
  value,
  onChange,
  helperText,
}: NavigationMediaFieldProps) {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest<{ ok: true; asset: { url: string; publicId: string } }>(
        '/api/admin/navigation/media/upload',
        {
          method: 'POST',
          body: formData,
        },
      );
      onChange(res.asset.url, res.asset.publicId);
      dispatch(showToast({ variant: 'success', message: 'Mega menu image uploaded successfully.' }));
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Image upload failed.',
        }),
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      <div className="flex flex-col gap-3 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/60 p-3 sm:flex-row sm:items-center">
        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {value ? (
            <ResilientImage src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <ImagePlus className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#145CFF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPresets((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-[#0F1D3A] dark:text-slate-200 hover:border-[#145CFF]"
            >
              {showPresets ? 'Hide Asset Library' : 'Choose Store Asset'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('', '')}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>

          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste HTTPS URL or /src/assets/images/... path"
            className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-700 dark:text-slate-200"
          />

          {helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}
        </div>
      </div>

      {showPresets && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 sm:grid-cols-4">
          {BUNDLED_PRESETS.map((preset) => (
            <button
              key={preset.url}
              type="button"
              onClick={() => {
                onChange(preset.url, '');
                setShowPresets(false);
              }}
              className={`group overflow-hidden rounded-lg border text-left transition-all ${
                value === preset.url
                  ? 'border-[#145CFF] ring-2 ring-[#145CFF]/25'
                  : 'border-slate-200 dark:border-slate-700 hover:border-[#145CFF]'
              }`}
            >
              <div className="h-14 w-full overflow-hidden bg-slate-100">
                <ResilientImage src={preset.url} alt={preset.label} className="h-full w-full object-cover" />
              </div>
              <span className="block truncate px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
