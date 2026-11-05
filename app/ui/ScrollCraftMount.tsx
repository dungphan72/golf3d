'use client';
import { useEffect, useRef, useState } from 'react';

type Chapter = { el: HTMLElement; title: string; at: number };
type Engine = { mount: (root: Element) => { destroy?: () => void } };
declare global {
  interface Window {
    ScrollCraft?: Engine;
  }
}

/**
 * Mounts the ScrollCraft engine on the landing page and adds the page's own signature move:
 * the shot trace rail. The whole page is one golf shot. The ball is the scroll position, the
 * arc is drawn behind it, every chapter passed plants a flag that stays, and the flags are also
 * the navigation. Nothing here touches the engine.
 */
export default function ScrollCraftMount() {
  const rail = useRef<HTMLDivElement>(null);
  const [chapters, setChapters] = useState<{ title: string; at: number }[]>([]);

  useEffect(() => {
    let engine: { destroy?: () => void } | undefined;
    let cancelled = false;
    const root = document.querySelector<HTMLElement>('.sg');

    const start = () => {
      if (cancelled || !root || !window.ScrollCraft) return;
      engine = window.ScrollCraft.mount(root);
    };
    if (window.ScrollCraft) start();
    else {
      const existing = document.getElementById('scrollcraft-engine') as HTMLScriptElement | null;
      if (existing) existing.addEventListener('load', start);
      else {
        const s = document.createElement('script');
        s.id = 'scrollcraft-engine';
        s.src = '/scrollcraft/scrollcraft.js';
        s.async = true;
        s.addEventListener('load', start);
        document.body.appendChild(s);
      }
    }

    const folio = document.querySelector<HTMLElement>('[data-folio]');
    let list: Chapter[] = [];
    const measure = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      list = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]')).map((el) => ({
        el,
        title: el.dataset.chapter ?? '',
        at: Math.min(1, Math.max(0, (el.getBoundingClientRect().top + window.scrollY) / max)),
      }));
      setChapters(
        list.filter((c) => c.title !== 'Trang bìa').map((c) => ({ title: c.title, at: c.at })),
      );
    };
    let queued = false;
    const update = () => {
      queued = false;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      rail.current?.style.setProperty('--pp', p.toFixed(4));
      let current = list[0];
      for (const c of list) {
        if (c.el.getBoundingClientRect().top <= window.innerHeight * 0.45) current = c;
      }
      if (folio && current) folio.textContent = current.title;
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    // Layout settles after fonts and the engine's pinned stages are sized.
    const settle = window.setTimeout(onResize, 700);
    measure();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.clearTimeout(settle);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      engine?.destroy?.();
    };
  }, []);

  const jump = (at: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: at * max + 2, behavior: 'smooth' });
  };

  return (
    <div className="sg-trace" ref={rail} role="navigation" aria-label="Các chương của trang">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
        <path className="sg-trace-base" d="M0 26 Q 50 -18 100 26" />
      </svg>
      <svg
        className="sg-trace-drawn"
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="sg-trace-line" d="M0 26 Q 50 -18 100 26" />
      </svg>
      <span className="sg-trace-ball" aria-hidden="true" />
      {chapters.map((c) => (
        <button
          key={c.title}
          type="button"
          className="sg-flag"
          style={{ ['--at' as string]: c.at }}
          title={c.title}
          aria-label={`Tới ${c.title}`}
          onClick={() => jump(c.at)}
        />
      ))}
    </div>
  );
}
