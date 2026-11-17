import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../features/notifications/toastSlice';
import { ResilientImage } from '../ui/ResilientImage';

interface CloudinaryImageFieldProps {
  label: string;
  value: string;
  onChange: (url: string, publicId?: string) => void;
  folder?: string;
  helperText?: string;
}

export function CloudinaryImageField({
  label,
  value,
  onChange,
  folder = 'general',
  helperText,
}: CloudinaryImageFieldProps) {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await apiRequest<{ ok: true; asset: { url: string; publicId: string } }>('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });
      onChange(res.asset.url, res.asset.publicId);
      dispatch(showToast({ variant: 'success', message: 'Image uploaded to Cloudinary.' }));
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Cloudinary upload failed.',
        }),
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {value ? (
            <ResilientImage src={value} alt={label} className="h-full w-full object-contain p-1" />
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1155EE] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0B44CC] disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? 'Uploading...' : 'Upload to Cloudinary'}</span>
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('', '')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
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
            placeholder="Or paste HTTPS / local asset URL (/src/assets/...)"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          />
          {helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}
        </div>
      </div>
    </div>
  );
}
