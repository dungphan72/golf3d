'use client';
import { useEffect } from 'react';

type Engine = { mount: (root: Element) => { destroy?: () => void } };
declare global {
  interface Window {
    ScrollCraft?: Engine;
  }
}

/**
 * Mounts the ScrollCraft engine (reveal-on-scroll and count-up only) and toggles the compact
 * fixed header once the hero's own navigation has scrolled away.
 */
export default function LandingFx() {
  useEffect(() => {
    let engine: { destroy?: () => void } | undefined;
    let cancelled = false;
    const root = document.querySelector<HTMLElement>('.fw');
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

    const fixed = document.querySelector<HTMLElement>('.fw-fixed');
    const hero = document.querySelector<HTMLElement>('.fw-hero');
    let queued = false;
    const update = () => {
      queued = false;
      const past = hero ? window.scrollY > hero.offsetHeight * 0.55 : window.scrollY > 300;
      fixed?.classList.toggle('on', past);
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener('scroll', onScroll);
      engine?.destroy?.();
    };
  }, []);
  return null;
}
