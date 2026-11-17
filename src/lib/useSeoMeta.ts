import { useEffect } from 'react';

interface SeoMetaOptions {
  title: string;
  description?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

export function useSeoMeta({ title, description, noIndex = false, jsonLd }: SeoMetaOptions) {
  useEffect(() => {
    document.title = title;

    const setMeta = (selector: string, attrName: 'name' | 'property', attrVal: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    const canonicalUrl = window.location.origin + window.location.pathname;
    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    const existingJsonLd = document.getElementById('novara-json-ld');
    if (jsonLd) {
      const script = existingJsonLd || document.createElement('script');
      script.id = 'novara-json-ld';
      script.setAttribute('type', 'application/ld+json');
      script.textContent = JSON.stringify(jsonLd);
      if (!existingJsonLd) document.head.appendChild(script);
    } else if (existingJsonLd) {
      existingJsonLd.remove();
    }
  }, [title, description, noIndex, jsonLd]);
}
