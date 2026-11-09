'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Upload,
  Image as ImageIcon,
  Save,
  RotateCcw,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  Smartphone,
  Monitor,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  Crown,
  Star,
  MessageCircle,
  Info,
  CalendarCheck,
  ChevronRight,
  ShieldCheck,
  Coffee,
  Car,
  Sun,
  Target,
  Award,
  Shield,
} from 'lucide-react';
import {
  DEFAULT_LANDING_CONFIG,
  type LandingConfig,
  type GalleryPhoto,
  type AmenityCard,
  type TestimonialItem,
} from '../../lib/landing-config';
import './landing-cms.css';

const AMENITY_ICONS = {
  target: Target,
  shield: Shield,
  award: Award,
  coffee: Coffee,
  car: Car,
  sun: Sun,
};

export default function LandingCmsPanel() {
  const [config, setConfig] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [activeTab, setActiveTab] = useState<
    'hero' | 'brand' | 'gallery' | 'rooms' | 'amenities' | 'reviews' | 'preview'
  >('hero');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // File upload refs
  const rootRef = useRef<HTMLDivElement>(null);
  // Every field is a <label> next to its control; link them so screen readers and tests can name the controls.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll('.lcms-field').forEach((field, i) => {
      const label = field.querySelector(':scope > label');
      const control = field.querySelector('input:not([type=file]), textarea, select');
      if (!label || !control || label.getAttribute('for')) return;
      if (!control.id) control.id = `lcms-f${i}-${Math.random().toString(36).slice(2, 7)}`;
      label.setAttribute('for', control.id);
    });
  });
  const heroFileRef = useRef<HTMLInputElement>(null);
  const heroMobileFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  // Gallery photo modal
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/landing');
      const json = (await res.json()) as { ok?: boolean; data?: typeof config };
      if (json.ok && json.data) {
        setConfig(json.data);
      }
    } catch (e) {
      console.error('Fetch landing error:', e);
      showToast('Không tải được cấu hình từ server, đang dùng mặc định', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; url?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Lưu thất bại');
      }
      showToast('Đã lưu và xuất bản thay đổi lên trang chủ thành công!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; url?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Tải ảnh thất bại');
      }
      if (!data.url) throw new Error("Máy chủ không trả về đường dẫn ảnh");
      onUploaded(data.url);
      showToast('Tải ảnh lên thành công!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const updateField = <K extends keyof LandingConfig>(field: K, val: LandingConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: val }));
  };

  if (loading) {
    return (
      <div className="lcms-loading">
        <div className="lcms-spinner"></div>
        <p>Đang tải cấu hình Landing Page...</p>
      </div>
    );
  }

  return (
    <div className="lcms-container" ref={rootRef}>
      {/* Toast Alert */}
      {toast && (
        <div className={`lcms-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="lcms-header">
        <div className="lcms-title-group">
          <div className="lcms-badge">
            <Globe size={14} />
            <span>Quản Trị Giao Diện & Nội Dung</span>
          </div>
          <h1>Landing Page Manager</h1>
          <p>
            Tùy biến hình ảnh Hero, thông tin thương hiệu, bảng giá, thư viện 9 ảnh thực tế và các
            khối tiện ích trên trang chủ Saigon Golf 3D Club.
          </p>
        </div>

        <div className="lcms-header-actions">
          <button
            type="button"
            className="lcms-btn ghost"
            onClick={() => window.open('/', '_blank')}
            title="Mở trang chủ trên tab mới để kiểm tra"
          >
            <ExternalLink size={16} />
            <span>Xem Trang Chủ</span>
          </button>

          <button
            type="button"
            className="lcms-btn secondary"
            onClick={() => {
              if (confirm('Khôi phục toàn bộ cấu hình về mặc định ban đầu?')) {
                setConfig(DEFAULT_LANDING_CONFIG);
                showToast('Đã khôi phục về cấu hình mặc định', 'success');
              }
            }}
          >
            <RotateCcw size={16} />
            <span>Khôi phục mặc định</span>
          </button>

          <button
            type="button"
            className="lcms-btn primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="lcms-spinner sm"></div>
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Lưu & Xuất Bản</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="lcms-tabs" aria-label="Menu chức năng">
        <button
          type="button"
          className={`lcms-tab ${activeTab === 'hero' ? 'active' : ''}`}
          onClick={() => setActiveTab('hero')}
        >
          <ImageIcon size={16} />
          <span>1. Hero Banner</span>
        </button>

        <button
          type="button"
          className={`lcms-tab ${activeTab === 'brand' ? 'active' : ''}`}
          onClick={() => setActiveTab('brand')}
        >
          <MapPin size={16} />
          <span>2. Thông Tin & Liên Hệ</span>
        </button>

        <button
          type="button"
          className={`lcms-tab ${activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          <Layers size={16} />
          <span>3. Thư Viện Ảnh (9 Ảnh)</span>
        </button>

        <button
          type="button"
          className={`lcms-tab ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          <Crown size={16} />
          <span>4. Phòng Chơi & Giá</span>
        </button>

        <button
          type="button"
          className={`lcms-tab ${activeTab === 'amenities' ? 'active' : ''}`}
          onClick={() => setActiveTab('amenities')}
        >
          <Sparkles size={16} />
          <span>5. Tiện Ích Bento</span>
        </button>

        <button
          type="button"
          className={`lcms-tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <Star size={16} />
          <span>6. Đánh Giá Golfer</span>
        </button>

        <button
          type="button"
          className={`lcms-tab preview-tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={16} />
          <span>7. Xem Trước Trực Quan</span>
        </button>
      </nav>

      {/* Main Content Body */}
      <main className="lcms-body">
        {/* ============================================================== */}
        {/* TAB 1: HERO BANNER */}
        {/* ============================================================== */}
        {activeTab === 'hero' && (
          <section className="lcms-card fade-in">
            <div className="lcms-card-head">
              <h2>Cấu Hình Hero Banner Đầu Trang</h2>
              <p>
                Quản lý hình ảnh banner 2K sắc nét, ảnh tương thích thiết bị di động và các nút kêu gọi
                hành động chính.
              </p>
            </div>

            <div className="lcms-grid-2">
              {/* Desktop Hero Image */}
              <div className="lcms-field">
                <label>Ảnh Hero Desktop (Khuyến nghị 2048 x 818px tỉ lệ 21:9 hoặc 2.5:1)</label>
                <div className="lcms-image-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={config.heroDesktopImage} alt="Desktop Hero" />
                  <div className="lcms-preview-badge">Desktop Preview</div>
                </div>
                <div className="lcms-upload-row">
                  <input
                    type="text"
                    className="lcms-input"
                    value={config.heroDesktopImage}
                    onChange={(e) => updateField('heroDesktopImage', e.target.value)}
                    placeholder="/img/hero-room.webp"
                  />
                  <input
                    type="file"
                    ref={heroFileRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={(e) =>
                      handleFileUpload(e, (url) => updateField('heroDesktopImage', url))
                    }
                  />
                  <button
                    type="button"
                    className="lcms-btn secondary sm"
                    onClick={() => heroFileRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload size={14} />
                    <span>{uploading ? 'Đang tải...' : 'Tải ảnh mới'}</span>
                  </button>
                </div>
              </div>

              {/* Mobile Hero Image */}
              <div className="lcms-field">
                <label>Ảnh Hero Mobile (Tối ưu tải nhẹ cho 4G/5G, tỉ lệ 16:9 hoặc 2.5:1)</label>
                <div className="lcms-image-preview mobile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={config.heroMobileImage} alt="Mobile Hero" />
                  <div className="lcms-preview-badge">Mobile Preview</div>
                </div>
                <div className="lcms-upload-row">
                  <input
                    type="text"
                    className="lcms-input"
                    value={config.heroMobileImage}
                    onChange={(e) => updateField('heroMobileImage', e.target.value)}
                    placeholder="/img/hero-room-m.webp"
                  />
                  <input
                    type="file"
                    ref={heroMobileFileRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={(e) =>
                      handleFileUpload(e, (url) => updateField('heroMobileImage', url))
                    }
                  />
                  <button
                    type="button"
                    className="lcms-btn secondary sm"
                    onClick={() => heroMobileFileRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload size={14} />
                    <span>{uploading ? 'Đang tải...' : 'Tải ảnh mới'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lcms-divider"></div>

            <div className="lcms-grid-2">
              <div className="lcms-field">
                <label>Dòng Badge Giới Thiệu (Nhãn công nghệ)</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.heroBadge}
                  onChange={(e) => updateField('heroBadge', e.target.value)}
                />
              </div>

              <div className="lcms-field">
                <label>Tiêu Đề Chính SEO (H1 Tag ẩn trên stage)</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.heroHeadline}
                  onChange={(e) => updateField('heroHeadline', e.target.value)}
                />
              </div>
            </div>

            <div className="lcms-field">
              <label>Đoạn Mô Tả Giới Thiệu Ngắn (Sub-headline)</label>
              <textarea
                className="lcms-textarea"
                rows={2}
                value={config.heroSubheadline}
                onChange={(e) => updateField('heroSubheadline', e.target.value)}
              />
            </div>

            <div className="lcms-grid-3">
              <div className="lcms-field">
                <label>Chữ Nút Đặt Chỗ (CTA Button Text)</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.heroCtaText}
                  onChange={(e) => updateField('heroCtaText', e.target.value)}
                />
              </div>

              <div className="lcms-field">
                <label>Đích Đến Nút Đặt Chỗ (CTA Link)</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.heroCtaLink}
                  onChange={(e) => updateField('heroCtaLink', e.target.value)}
                />
              </div>

              <div className="lcms-field">
                <label>Chữ Nút Gọi Hotline</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.heroCallCtaText}
                  onChange={(e) => updateField('heroCallCtaText', e.target.value)}
                />
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BRAND & CONTACT */}
        {/* ============================================================== */}
        {activeTab === 'brand' && (
          <section className="lcms-card fade-in">
            <div className="lcms-card-head">
              <h2>Thông Tin Câu Lạc Bộ & Liên Hệ</h2>
              <p>Cập nhật tên thương hiệu, hotline, địa chỉ, giờ mở cửa và link Zalo hỗ trợ.</p>
            </div>

            <div className="lcms-grid-3">
              <div className="lcms-field">
                <label>Tên Đầy Đủ Câu Lạc Bộ</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.brandName}
                  onChange={(e) => updateField('brandName', e.target.value)}
                />
              </div>

              <div className="lcms-field">
                <label>Tên Viết Tắt Header (Short Brand)</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.brandShort}
                  onChange={(e) => updateField('brandShort', e.target.value)}
                />
              </div>

              <div className="lcms-field">
                <label>Dòng Chữ Dưới Logo (Brand Subtitle)</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.brandSub}
                  onChange={(e) => updateField('brandSub', e.target.value)}
                />
              </div>
            </div>

            <div className="lcms-grid-2">
              <div className="lcms-field">
                <label>Địa Chỉ Thực Tế Cơ Sở</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>

              <div className="lcms-field">
                <label>Số Điện Thoại Hotline</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.hotline}
                  onChange={(e) => updateField('hotline', e.target.value)}
                />
              </div>
            </div>

            <div className="lcms-grid-3">
              <div className="lcms-field">
                <label>Giờ Mở Cửa Mỗi Ngày</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.hours}
                  onChange={(e) => updateField('hours', e.target.value)}
                />
              </div>

              <div className="lcms-field">
                <label>Khung Giờ Vàng Ưu Đãi</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.goldTimeText}
                  onChange={(e) => updateField('goldTimeText', e.target.value)}
                />
              </div>

              <div className="lcms-field">
                <label>Đường Dẫn Zalo OA / Chat</label>
                <input
                  type="text"
                  className="lcms-input"
                  value={config.zalo}
                  onChange={(e) => updateField('zalo', e.target.value)}
                />
              </div>
            </div>

            <div className="lcms-field">
              <label>Đường Dẫn Google Maps Chỉ Đường</label>
              <input
                type="text"
                className="lcms-input"
                value={config.mapUrl}
                onChange={(e) => updateField('mapUrl', e.target.value)}
              />
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 3: GALLERY ALBUM */}
        {/* ============================================================== */}
        {activeTab === 'gallery' && (
          <section className="lcms-card fade-in">
            <div className="lcms-card-head flex-between">
              <div>
                <h2>Thư Viện Album Ảnh Thực Tế (9 Ảnh)</h2>
                <p>
                  Quản lý đúng 9 bức ảnh chất lượng cao chia đều 3 danh mục (3 VIP, 3 Line Tiêu
                  Chuẩn, 3 Quầy Bar) giúp giao diện luôn kín dòng và vuông vức.
                </p>
              </div>
              <button
                type="button"
                className="lcms-btn primary sm"
                onClick={() =>
                  setEditingPhoto({
                    id: 'new-' + Date.now(),
                    src: '/img/space-wide.webp',
                    title: 'Ảnh mới',
                    category: 'standard',
                    categoryLabel: '8 Line Tiêu Chuẩn',
                    desc: 'Mô tả hình ảnh...',
                  })
                }
              >
                <Plus size={16} />
                <span>Thêm Ảnh Mới</span>
              </button>
            </div>

            <div className="lcms-gallery-grid">
              {config.galleryPhotos.map((photo, idx) => (
                <div key={photo.id || idx} className="lcms-photo-card">
                  <div className="lcms-photo-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.src} alt={photo.title} />
                    <span className={`lcms-photo-tag ${photo.category}`}>
                      {photo.categoryLabel || photo.category}
                    </span>
                  </div>
                  <div className="lcms-photo-body">
                    <h4>{photo.title}</h4>
                    <p>{photo.desc}</p>
                    <div className="lcms-photo-actions">
                      <button
                        type="button"
                        className="lcms-btn ghost sm"
                        onClick={() => setEditingPhoto(photo)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="lcms-btn danger sm"
                        onClick={() => {
                          if (confirm('Xóa ảnh này khỏi album?')) {
                            const updated = config.galleryPhotos.filter((p) => p.id !== photo.id);
                            updateField('galleryPhotos', updated);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Photo Editor Modal */}
            {editingPhoto && (
              <div className="lcms-modal-backdrop" onClick={() => setEditingPhoto(null)}>
                <div className="lcms-modal-box" onClick={(e) => e.stopPropagation()}>
                  <div className="lcms-modal-head">
                    <h3>Chỉnh Sửa Thông Tin Ảnh Album</h3>
                    <button
                      type="button"
                      className="lcms-close"
                      onClick={() => setEditingPhoto(null)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="lcms-field">
                    <label>Tiêu Đề Ảnh</label>
                    <input
                      type="text"
                      className="lcms-input"
                      value={editingPhoto.title}
                      onChange={(e) =>
                        setEditingPhoto({ ...editingPhoto, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="lcms-grid-2">
                    <div className="lcms-field">
                      <label>Danh Mục Phân Loại</label>
                      <select
                        className="lcms-input"
                        value={editingPhoto.category}
                        onChange={(e) => {
                          const cat = e.target.value as 'vip' | 'standard' | 'lounge';
                          const catLabels = {
                            vip: 'Phòng VIP Riêng Tư',
                            standard: '8 Line Tiêu Chuẩn',
                            lounge: 'Quầy Bar & Lounge',
                          };
                          setEditingPhoto({
                            ...editingPhoto,
                            category: cat,
                            categoryLabel: catLabels[cat],
                          });
                        }}
                      >
                        <option value="vip">Phòng VIP Riêng Tư</option>
                        <option value="standard">8 Line Tiêu Chuẩn</option>
                        <option value="lounge">Quầy Bar & Lounge</option>
                      </select>
                    </div>

                    <div className="lcms-field">
                      <label>Đường Dẫn Hình Ảnh (URL)</label>
                      <div className="lcms-upload-row">
                        <input
                          type="text"
                          className="lcms-input"
                          value={editingPhoto.src}
                          onChange={(e) =>
                            setEditingPhoto({ ...editingPhoto, src: e.target.value })
                          }
                        />
                        <input
                          type="file"
                          ref={galleryFileRef}
                          style={{ display: 'none' }}
                          accept="image/*"
                          onChange={(e) =>
                            handleFileUpload(e, (url) =>
                              setEditingPhoto({ ...editingPhoto, src: url })
                            )
                          }
                        />
                        <button
                          type="button"
                          className="lcms-btn secondary sm"
                          onClick={() => galleryFileRef.current?.click()}
                          disabled={uploading}
                        >
                          <Upload size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lcms-field">
                    <label>Mô Tả Bức Ảnh</label>
                    <textarea
                      className="lcms-textarea"
                      rows={3}
                      value={editingPhoto.desc}
                      onChange={(e) =>
                        setEditingPhoto({ ...editingPhoto, desc: e.target.value })
                      }
                    />
                  </div>

                  <div className="lcms-modal-actions">
                    <button
                      type="button"
                      className="lcms-btn ghost"
                      onClick={() => setEditingPhoto(null)}
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="button"
                      className="lcms-btn primary"
                      onClick={() => {
                        const exists = config.galleryPhotos.some((p) => p.id === editingPhoto.id);
                        const updated = exists
                          ? config.galleryPhotos.map((p) =>
                              p.id === editingPhoto.id ? editingPhoto : p
                            )
                          : [...config.galleryPhotos, editingPhoto];
                        updateField('galleryPhotos', updated);
                        setEditingPhoto(null);
                        showToast('Đã cập nhật ảnh', 'success');
                      }}
                    >
                      Lưu Ảnh
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 4: ROOMS SHOWCASE */}
        {/* ============================================================== */}
        {activeTab === 'rooms' && (
          <section className="lcms-card fade-in">
            <div className="lcms-card-head">
              <h2>Cấu Hình Phòng Chơi & Bảng Giá Khởi Điểm</h2>
              <p>Tùy chỉnh thông tin giới thiệu 8 Line Tiêu Chuẩn và 2 Phòng VIP Doanh Nhân.</p>
            </div>

            <div className="lcms-grid-2">
              {/* Standard Room Config */}
              <div className="lcms-sub-card">
                <div className="lcms-sub-head">
                  <Monitor size={18} className="text-green" />
                  <h3>Line Golf 3D Tiêu Chuẩn</h3>
                </div>

                <div className="lcms-field">
                  <label>Tiêu Đề Line Tiêu Chuẩn</label>
                  <input
                    type="text"
                    className="lcms-input"
                    value={config.standardTitle}
                    onChange={(e) => updateField('standardTitle', e.target.value)}
                  />
                </div>

                <div className="lcms-field">
                  <label>Giá Chỉ Từ (VNĐ / Giờ)</label>
                  <input
                    type="number"
                    className="lcms-input"
                    value={config.standardPriceFrom}
                    onChange={(e) => updateField('standardPriceFrom', Number(e.target.value))}
                  />
                </div>

                <div className="lcms-field">
                  <label>Đoạn Giới Thiệu Line</label>
                  <textarea
                    className="lcms-textarea"
                    rows={3}
                    value={config.standardDesc}
                    onChange={(e) => updateField('standardDesc', e.target.value)}
                  />
                </div>

                <div className="lcms-field">
                  <label>Ảnh Đại Diện Line</label>
                  <input
                    type="text"
                    className="lcms-input"
                    value={config.standardImage}
                    onChange={(e) => updateField('standardImage', e.target.value)}
                  />
                </div>
              </div>

              {/* VIP Room Config */}
              <div className="lcms-sub-card vip">
                <div className="lcms-sub-head">
                  <Crown size={18} className="text-gold" />
                  <h3>Phòng VIP Doanh Nhân</h3>
                </div>

                <div className="lcms-field">
                  <label>Tiêu Đề Phòng VIP</label>
                  <input
                    type="text"
                    className="lcms-input"
                    value={config.vipTitle}
                    onChange={(e) => updateField('vipTitle', e.target.value)}
                  />
                </div>

                <div className="lcms-field">
                  <label>Giá Chỉ Từ (VNĐ / Giờ)</label>
                  <input
                    type="number"
                    className="lcms-input"
                    value={config.vipPriceFrom}
                    onChange={(e) => updateField('vipPriceFrom', Number(e.target.value))}
                  />
                </div>

                <div className="lcms-field">
                  <label>Đoạn Giới Thiệu Phòng VIP</label>
                  <textarea
                    className="lcms-textarea"
                    rows={3}
                    value={config.vipDesc}
                    onChange={(e) => updateField('vipDesc', e.target.value)}
                  />
                </div>

                <div className="lcms-field">
                  <label>Ảnh Đại Diện Phòng VIP</label>
                  <input
                    type="text"
                    className="lcms-input"
                    value={config.vipImage}
                    onChange={(e) => updateField('vipImage', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 5: BENTO AMENITIES */}
        {/* ============================================================== */}
        {activeTab === 'amenities' && (
          <section className="lcms-card fade-in">
            <div className="lcms-card-head">
              <h2>Quản Lý 6 Tiện Ích Bento Nổi Bật</h2>
              <p>Chỉnh sửa 6 thẻ tiện ích được sắp xếp kín 2 hàng x 3 cột trên trang chủ.</p>
            </div>

            <div className="lcms-grid-2">
              {config.amenities.map((item, idx) => {
                const IconComp = AMENITY_ICONS[item.icon] || Sparkles;
                return (
                  <div key={item.id || idx} className="lcms-amenity-card">
                    <div className="lcms-amenity-header">
                      <div className="lcms-amenity-icon">
                        <IconComp size={20} />
                      </div>
                      <input
                        type="text"
                        className="lcms-input sm"
                        value={item.badge}
                        onChange={(e) => {
                          const updated = [...config.amenities];
                          updated[idx] = { ...item, badge: e.target.value };
                          updateField('amenities', updated);
                        }}
                        placeholder="Nhãn badge"
                      />
                    </div>

                    <div className="lcms-field">
                      <label>Tiêu Đề Tiện Ích</label>
                      <input
                        type="text"
                        className="lcms-input"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...config.amenities];
                          updated[idx] = { ...item, title: e.target.value };
                          updateField('amenities', updated);
                        }}
                      />
                    </div>

                    <div className="lcms-field">
                      <label>Nội Dung Mô Tả</label>
                      <textarea
                        className="lcms-textarea"
                        rows={2}
                        value={item.desc}
                        onChange={(e) => {
                          const updated = [...config.amenities];
                          updated[idx] = { ...item, desc: e.target.value };
                          updateField('amenities', updated);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 6: REVIEWS */}
        {/* ============================================================== */}
        {activeTab === 'reviews' && (
          <section className="lcms-card fade-in">
            <div className="lcms-card-head flex-between">
              <div>
                <h2>Đánh Giá Từ Golfer Thực Tế</h2>
                <p>Quản lý các nhận xét, đánh giá 5 sao hiển thị ở phần chân trang chủ.</p>
              </div>
              <button
                type="button"
                className="lcms-btn primary sm"
                onClick={() => {
                  const newReview: TestimonialItem = {
                    id: 'rev-' + Date.now(),
                    name: 'Golfer mới',
                    handicap: 'HDC 20',
                    avatar: 'G',
                    stars: 5,
                    content: 'Dịch vụ rất tốt, phòng chơi hiện đại và nhân viên nhiệt tình.',
                  };
                  updateField('testimonials', [...config.testimonials, newReview]);
                }}
              >
                <Plus size={16} />
                <span>Thêm Đánh Giá</span>
              </button>
            </div>

            <div className="lcms-grid-3">
              {config.testimonials.map((rev, idx) => (
                <div key={rev.id || idx} className="lcms-review-card">
                  <div className="lcms-review-head">
                    <div className="lcms-review-avatar">{rev.avatar || rev.name[0]}</div>
                    <div className="lcms-review-info">
                      <input
                        type="text"
                        className="lcms-input sm"
                        value={rev.name}
                        onChange={(e) => {
                          const updated = [...config.testimonials];
                          updated[idx] = { ...rev, name: e.target.value };
                          updateField('testimonials', updated);
                        }}
                      />
                      <input
                        type="text"
                        className="lcms-input sm text-muted"
                        value={rev.handicap}
                        onChange={(e) => {
                          const updated = [...config.testimonials];
                          updated[idx] = { ...rev, handicap: e.target.value };
                          updateField('testimonials', updated);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="lcms-btn danger sm"
                      onClick={() => {
                        const updated = config.testimonials.filter((r) => r.id !== rev.id);
                        updateField('testimonials', updated);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="lcms-review-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={15} className="fill-gold" />
                    ))}
                  </div>

                  <textarea
                    className="lcms-textarea sm"
                    rows={3}
                    value={rev.content}
                    onChange={(e) => {
                      const updated = [...config.testimonials];
                      updated[idx] = { ...rev, content: e.target.value };
                      updateField('testimonials', updated);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 7: LIVE PREVIEW */}
        {/* ============================================================== */}
        {activeTab === 'preview' && (
          <section className="lcms-card fade-in">
            <div className="lcms-card-head flex-between">
              <div>
                <h2>Xem Trước Trực Quan Giao Diện</h2>
                <p>Xem trước hình ảnh Hero, thông tin và bố cục trang chủ thời gian thực.</p>
              </div>

              <div className="lcms-device-toggle">
                <button
                  type="button"
                  className={previewDevice === 'desktop' ? 'active' : ''}
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Monitor size={16} />
                  <span>Desktop (Màn hình lớn)</span>
                </button>
                <button
                  type="button"
                  className={previewDevice === 'mobile' ? 'active' : ''}
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone size={16} />
                  <span>Mobile App (Điện thoại)</span>
                </button>
              </div>
            </div>

            <div className={`lcms-preview-wrapper ${previewDevice}`}>
              {previewDevice === 'desktop' ? (
                /* Desktop Preview Mockup */
                <div className="lcms-mock-desktop">
                  {/* Mock Navbar */}
                  <div className="lcms-mock-nav">
                    <div className="lcms-mock-brand">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.webp" alt="Logo" width={28} height={28} />
                      <strong>{config.brandShort}</strong>
                    </div>
                    <div className="lcms-mock-links">
                      <span>Trang chủ</span>
                      <span>Bảng giá</span>
                      <span>Thẻ hội viên</span>
                    </div>
                    <div className="lcms-mock-cta">{config.heroCtaText} ↗</div>
                  </div>

                  {/* Mock Hero Stage */}
                  <div className="lcms-mock-stage">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={config.heroDesktopImage}
                      alt="Hero Desktop"
                      className="lcms-mock-hero-img"
                    />
                  </div>

                  {/* Mock Quick Booking Bar */}
                  <div className="lcms-mock-bar">
                    <div className="lcms-mock-badge">
                      <Sparkles size={14} />
                      <span>Đặt phòng nhanh — Không cần trả trước</span>
                    </div>
                    <div className="lcms-mock-inputs">
                      <div className="mock-pill active">Hôm nay</div>
                      <div className="mock-pill gold active">{config.goldTimeText}</div>
                      <div className="mock-pill active">Line Tiêu Chuẩn</div>
                      <div className="mock-btn-book">Kiểm tra & Giữ phòng ↗</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Mobile Phone Frame Mockup */
                <div className="lcms-mock-mobile-frame">
                  <div className="mobile-speaker"></div>
                  <div className="mobile-screen">
                    <div className="mobile-status-bar">
                      <span>09:41</span>
                      <span>5G 100%</span>
                    </div>

                    {/* Mobile Hero */}
                    <div className="mobile-hero-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={config.heroMobileImage} alt="Mobile Hero" />
                    </div>

                    {/* Mobile Quick Bar */}
                    <div className="mobile-quick-card">
                      <div className="mobile-badge">
                        <Sparkles size={12} />
                        <span>Đặt phòng nhanh</span>
                      </div>
                      <div className="mobile-pill-row">
                        <div className="mock-pill active">Hôm nay</div>
                        <div className="mock-pill gold active">Giờ vàng</div>
                      </div>
                      <div className="mock-btn-book mobile">Đặt Line Ngay ↗</div>
                    </div>

                    {/* Mobile 5-Tab App Bar */}
                    <div className="mobile-bottom-app-bar">
                      <div className="bar-item active">Trang Chủ</div>
                      <div className="bar-item">Bảng Giá</div>
                      <div className="bar-fab">Đặt Chỗ</div>
                      <div className="bar-item">Gói Thẻ</div>
                      <div className="bar-item">Hội Viên</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
