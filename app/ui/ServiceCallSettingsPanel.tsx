'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Save,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Shield,
  Clock,
  Volume2,
  QrCode,
  Loader2,
} from 'lucide-react';
import {
  type ServiceCallSettings,
  DEFAULT_SERVICE_CALL_SETTINGS,
} from '../../lib/service-call';
import { CallQrSheet } from './CallQrSheet';
import { BellSettings } from './BellAlerts';

type SettingsForm = Omit<ServiceCallSettings, 'tenant' | 'updated_at'>;

type Props = {
  slug?: string;
};

export function ServiceCallSettingsPanel({ slug = 'sigolf' }: Props) {
  const [settings, setSettings] = useState<SettingsForm>(DEFAULT_SERVICE_CALL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/service-call/settings', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.ok && data.settings) {
            setSettings(data.settings);
          }
        }
      } catch {
        // Keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/service-call/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = (await res.json()) as any;
      if (res.ok && data.ok) {
        setNotice('Đã lưu cấu hình dịch vụ gọi phục vụ thành công!');
        if (data.settings) setSettings(data.settings);
      } else {
        setErrorMsg(data.error || 'Chưa lưu được cấu hình');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
        <p>Đang tải cấu hình Gọi phục vụ...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toast feedback */}
      {notice && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 6,
            background: '#ecfdf5',
            border: '1px solid #6ee7b7',
            color: '#065f46',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{notice}</span>
        </div>
      )}
      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 6,
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={18} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* CARD 1: CẤU HÌNH VẬN HÀNH & SLA */}
      <section style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>🔔 Thông báo trên thiết bị này</h3>
        <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
          Bật thông báo đẩy và cho phép trình duyệt gửi thông báo để nhận cuộc gọi phục vụ khi chuyển tab hoặc khóa màn hình. Trên iPhone, thêm ứng dụng vào Màn hình chính và mở từ biểu tượng để nhận đẩy.
        </p>
        <BellSettings />
      </section>
      <section
        style={{
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={20} color="#047857" />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                Cấu hình Gọi phục vụ trực tuyến (Service Call)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                Thiết lập phương thức quét QR, tiêu chuẩn cam kết thời gian (SLA) và âm thanh chuông báo POS.
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSave} style={{ padding: '20px' }}>
          {/* General switches */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}
          >
            {/* Enable feature */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                background: settings.is_enabled ? '#f0fdf4' : '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={settings.is_enabled}
                onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
                style={{ marginTop: 3, width: 16, height: 16, accentColor: '#047857' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: 14, color: '#1e293b' }}>
                  Kích hoạt hệ thống Gọi phục vụ
                </strong>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  Cho phép khách quét mã QR tại bàn để gọi nhân viên và dịch vụ.
                </span>
              </div>
            </label>

            {/* Sound alert */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                background: settings.sound_alert_enabled ? '#f0fdf4' : '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={settings.sound_alert_enabled}
                onChange={(e) => setSettings({ ...settings, sound_alert_enabled: e.target.checked })}
                style={{ marginTop: 3, width: 16, height: 16, accentColor: '#047857' }}
              />
              <div>
                <strong style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#1e293b' }}>
                  <Volume2 size={16} color="#047857" />
                  Âm thanh chuông báo tại POS
                </strong>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  Phát chuông 2 âm thanh nhắc nhở thu ngân ngay khi có yêu cầu mới.
                </span>
              </div>
            </label>
          </div>

          {/* Guest Mode Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Phương thức xác thực khách vãng lai:
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 12,
              }}
            >
              <label
                style={{
                  padding: '12px 16px',
                  borderRadius: 6,
                  border: settings.guest_mode === 'MODE_A' ? '2px solid #047857' : '1px solid #e2e8f0',
                  background: settings.guest_mode === 'MODE_A' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <input
                  type="radio"
                  name="guest_mode"
                  checked={settings.guest_mode === 'MODE_A'}
                  onChange={() => setSettings({ ...settings, guest_mode: 'MODE_A' })}
                  style={{ marginTop: 3, accentColor: '#047857' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: 13.5, color: '#1e293b' }}>
                    MODE A: Quét QR & Gọi ngay
                  </strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Tối ưu tốc độ, không bắt khách nhập thông tin cá nhân.
                  </span>
                </div>
              </label>

              <label
                style={{
                  padding: '12px 16px',
                  borderRadius: 6,
                  border: settings.guest_mode === 'MODE_B' ? '2px solid #047857' : '1px solid #e2e8f0',
                  background: settings.guest_mode === 'MODE_B' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <input
                  type="radio"
                  name="guest_mode"
                  checked={settings.guest_mode === 'MODE_B'}
                  onChange={() => setSettings({ ...settings, guest_mode: 'MODE_B' })}
                  style={{ marginTop: 3, accentColor: '#047857' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: 13.5, color: '#1e293b' }}>
                    MODE B: Bắt buộc nhập SĐT
                  </strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Khách phải nhập số điện thoại trước khi gửi yêu cầu.
                  </span>
                </div>
              </label>

              <label
                style={{
                  padding: '12px 16px',
                  borderRadius: 6,
                  border: settings.guest_mode === 'MODE_C' ? '2px solid #047857' : '1px solid #e2e8f0',
                  background: settings.guest_mode === 'MODE_C' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <input
                  type="radio"
                  name="guest_mode"
                  checked={settings.guest_mode === 'MODE_C'}
                  onChange={() => setSettings({ ...settings, guest_mode: 'MODE_C' })}
                  style={{ marginTop: 3, accentColor: '#047857' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: 13.5, color: '#1e293b' }}>
                    MODE C: Cho phép cả hai (Khuyến nghị)
                  </strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Khách có thể chọn gọi nhanh hoặc nhập SĐT để tích điểm.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* SLA & Cooldown settings */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                ⏱ SLA Tiếp nhận (giây):
              </label>
              <input
                type="number"
                min={30}
                max={600}
                value={settings.sla_ack_seconds}
                onChange={(e) => setSettings({ ...settings, sla_ack_seconds: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 5,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              <small style={{ color: '#64748b', fontSize: 11.5 }}>
                Mặc định: 120s (2 phút). Quá thời gian này sẽ báo vi phạm SLA.
              </small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                ✅ SLA Hoàn tất (giây):
              </label>
              <input
                type="number"
                min={120}
                max={3600}
                value={settings.sla_resolve_seconds}
                onChange={(e) => setSettings({ ...settings, sla_resolve_seconds: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 5,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              <small style={{ color: '#64748b', fontSize: 11.5 }}>
                Mặc định: 600s (10 phút).
              </small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                🛡️ Thời gian giãn cách Cooldown (giây):
              </label>
              <input
                type="number"
                min={10}
                max={300}
                value={settings.cooldown_seconds}
                onChange={(e) => setSettings({ ...settings, cooldown_seconds: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 5,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              <small style={{ color: '#64748b', fontSize: 11.5 }}>
                Thời gian chờ giữa 2 lần bấm gọi liên tiếp chống spam.
              </small>
            </div>
          </div>

          <div style={{ textAlign: 'right', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                borderRadius: 5,
                border: 'none',
                background: '#047857',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(4,120,87,0.3)',
              }}
            >
              {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* CARD 2: QUẢN LÝ VÀ IN ẤN MÃ QR THEO TỪNG LINE/PHÒNG */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <CallQrSheet slug={slug} />
      </section>
    </div>
  );
}
