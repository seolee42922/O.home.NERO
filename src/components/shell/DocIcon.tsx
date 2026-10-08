
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSiteSettings } from '@/lib/siteStore';
import { useBlobUrl } from '@/lib/blobStore';

const MARK = 'ohome-favicon';
const ORIG = 'data-ohome-icon-orig';

export function DocIcon() {
  const [site, , loaded] = useSiteSettings();
  const url = useBlobUrl(site.favicon);
  const pathname = usePathname();

  const [rounded, setRounded] = useState<{
    source: string;
    href: string;
  } | null>(null);

  // 기존 파비콘을 화면 표시용 둥근 PNG로 자동 변환
  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    const img = new Image();

    // 원격 이미지가 CORS를 허용할 때 캔버스 변환 가능
    if (/^https?:\/\//.test(url)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      if (cancelled) return;

      try {
        const size = 256;
        const radius = 56;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas unavailable');
        }

        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.clip();

        // 기존 이미지를 정사각형에 중앙 기준으로 맞춤
        const scale = Math.max(
          size / img.naturalWidth,
          size / img.naturalHeight
        );

        const width = img.naturalWidth * scale;
        const height = img.naturalHeight * scale;

        ctx.drawImage(
          img,
          (size - width) / 2,
          (size - height) / 2,
          width,
          height
        );

        const href = canvas.toDataURL('image/png');

        if (!cancelled) {
          setRounded({ source: url, href });
        }
      } catch {
        // 변환이 차단되면 원본 표시
        if (!cancelled) {
          setRounded({ source: url, href: url });
        }
      }
    };

    img.onerror = () => {
      if (!cancelled) {
        setRounded({ source: url, href: url });
      }
    };

    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  const iconUrl = !url
    ? null
    : rounded?.source === url
      ? rounded.href
      : null;

  useEffect(() => {
    if (!loaded) return;

    // 새 아이콘 변환을 기다리는 동안 기존 탭 아이콘 유지
    if (url && !iconUrl) return;

    const apply = () => {
      const mine = document.querySelector<HTMLLinkElement>(
        `link[data-${MARK}]`
      );

      const theirs = [
        ...document.querySelectorAll<HTMLLinkElement>(
          'link[rel~="icon"]'
        ),
      ].filter(
        link => !link.hasAttribute(`data-${MARK}`)
      );

      if (!iconUrl) {
        mine?.remove();

        theirs.forEach(link => {
          const original = link.getAttribute(ORIG);

          if (original !== null) {
            link.href = original;
            link.removeAttribute(ORIG);
          }
        });

        return;
      }

      // Next.js가 관리하는 link 태그는 삭제하지 않고
      // 주소만 변경해서 페이지 전환 오류를 방지
      theirs.forEach(link => {
        if (!link.hasAttribute(ORIG)) {
          link.setAttribute(
            ORIG,
            link.getAttribute('href') ?? ''
          );
        }

        if (link.href !== iconUrl) {
          link.href = iconUrl;
        }
      });

      if (mine) {
        if (mine.href !== iconUrl) {
          mine.href = iconUrl;
        }
        return;
      }

      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = iconUrl;
      link.setAttribute(`data-${MARK}`, '');

      document.head.appendChild(link);
    };

    apply();

    const observer = new MutationObserver(apply);

    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });

    return () => observer.disconnect();
  }, [loaded, url, iconUrl, pathname]);

  return null;
}
