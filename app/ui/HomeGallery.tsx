'use client';
import { useEffect, useRef, useState } from 'react';

type Photo = { id: string; src: string; title: string; categoryLabel: string; desc: string };

export default function HomeGallery({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const n = photos.length;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const step = (by: number) => setOpen((i) => (i === null ? i : (i + by + n) % n));
  const cur = open !== null ? photos[open] : null;

  return (
    <>
      <div className="hm-gallery">
        {photos.map((p, i) => (
          <button key={p.id} type="button" onClick={() => setOpen(i)} aria-label={`Xem ảnh: ${p.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={p.title} width={640} height={420} loading="lazy" />
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="hm-lightbox"
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
      >
        {cur && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.src} alt={cur.title} />
            <figcaption>
              <strong>{cur.title}</strong>
              <span>{cur.desc}</span>
            </figcaption>
          </figure>
        )}
        <div className="hm-lightbox-nav">
          <button type="button" onClick={() => step(-1)}>
            Trước
          </button>
          <span>
            {open === null ? 0 : open + 1} / {n}
          </span>
          <button type="button" onClick={() => step(1)}>
            Sau
          </button>
          <button type="button" onClick={() => setOpen(null)}>
            Đóng
          </button>
        </div>
      </dialog>
    </>
  );
}
