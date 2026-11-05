'use client';
import { useEffect } from 'react';

/**
 * Scroll-driven effects for the landing page, without any animation library:
 *  - reveal-on-scroll for [data-reveal] (IntersectionObserver, adds .is-in)
 *  - count-up numbers for [data-count]
 *  - parallax layers via the --sy custom property
 *  - reading progress bar, header state, and the pinned "story" section's progress (--story, data-step)
 * With prefers-reduced-motion everything is shown immediately and nothing moves.
 */
export default function ScrollFx() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const revealed = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).classList.add('is-in');
          revealed.unobserve(e.target);
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    );
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      if (reduce) el.classList.add('is-in');
      else revealed.observe(el);
    });

    const counted = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          counted.unobserve(e.target);
          const el = e.target as HTMLElement;
          const to = Number(el.dataset.count);
          const suffix = el.dataset.suffix ?? '';
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 1200);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(to * eased).toLocaleString('vi-VN') + suffix;
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.7 },
    );
    if (!reduce)
      document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => counted.observe(el));

    const bar = document.querySelector<HTMLElement>('.lp-progress');
    const header = document.querySelector<HTMLElement>('.lp-header');
    const story = document.querySelector<HTMLElement>('.lp-story');
    let queued = false;
    const update = () => {
      queued = false;
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty('--sy', String(reduce ? 0 : Math.min(y, 1600)));
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      header?.classList.toggle('scrolled', y > 24);
      if (story) {
        const r = story.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
        story.style.setProperty('--story', p.toFixed(4));
        story.dataset.step = String(Math.min(3, Math.floor(p * 4)));
      }
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      revealed.disconnect();
      counted.disconnect();
    };
  }, []);
  return null;
}
