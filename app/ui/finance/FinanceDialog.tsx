'use client';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { money } from '../../../lib/club';
import { operationKey, reconciliation, shiftTotals, type ShiftSummary } from '../../../lib/finance';
import { safeCount } from './shared';

export function FinanceDialog({
  kind,
  shift,
  busy,
  notice,
  onClose,
  onSave,
}: {
  kind: 'open' | 'cash' | 'close';
  shift?: ShiftSummary;
  busy: boolean;
  notice: string;
  onClose: () => void;
  onSave: (v: Record<string, unknown>) => Promise<boolean>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    requestId = useRef(operationKey());
  const [version, setVersion] = useState(shift?.version ?? 0),
    [cash, setCash] = useState(''),
    [transfer, setTransfer] = useState(''),
    [card, setCard] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const summary = shift
    ? reconciliation(shiftTotals(shift), {
        cash: safeCount(cash),
        transfer: safeCount(transfer),
        card: safeCount(card),
      })
    : null;
  const noLongerOpen = kind !== 'open' && shift?.status !== 'open';
  const changed = kind === 'close' && shift?.version !== version;
  const difference =
    summary &&
    [summary.cashDifference, summary.transferDifference, summary.cardDifference].some(
      (n) => n !== 0,
    );
  return (
    <dialog
      className="native-dialog"
      ref={dialog}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <section className="modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">SAIGON GOLF / CASH DESK</span>
            <h2>
              {kind === 'open'
                ? 'Mở ca mới'
                : kind === 'cash'
                  ? 'Ghi thu / chi tiền mặt'
                  : 'Đối soát & bàn giao'}
            </h2>
          </div>
          <button
            className="icon-btn"
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Đóng"
          >
            <X />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (kind === 'open')
              onSave({
                action: 'open',
                requestId: requestId.current,
                name: f.get('name'),
                openingCash: Number(f.get('openingCash')),
              });
            else if (kind === 'cash')
              onSave({
                action: 'cash-entry',
                requestId: requestId.current,
                shiftId: shift!.id,
                kind: f.get('kind'),
                amount: Number(f.get('amount')),
                note: f.get('note'),
              });
            else
              onSave({
                action: 'close',
                shiftId: shift!.id,
                expectedVersion: version,
                countedCash: Number(cash),
                countedTransfer: Number(transfer),
                countedCard: Number(card),
                note: f.get('note'),
              });
          }}
        >
          {notice && (
            <div className="info-strip" role="status">
              {notice}
            </div>
          )}
          {noLongerOpen && (
            <div className="info-strip">
              Ca đã được đóng ở thiết bị khác. Đóng hộp này để xem kết quả.
            </div>
          )}
          {kind === 'open' ? (
            <>
              <p className="dialog-intro">
                Nhập số tiền mặt đã kiểm đếm thực tế trong quỹ. Khoản này không tính là thực thu
                dịch vụ.
              </p>
              <div className="form-grid">
                <label>
                  Tên ca
                  <input
                    name="name"
                    defaultValue="Ca làm việc"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  Tiền mặt đầu ca (₫)
                  <input
                    name="openingCash"
                    type="number"
                    min="0"
                    max="1000000000000"
                    step="1"
                    defaultValue="0"
                    required
                  />
                </label>
              </div>
            </>
          ) : kind === 'cash' ? (
            <>
              <p className="dialog-intro">
                Ghi nộp quỹ, chi phí hoặc rút quỹ; không dùng thao tác này thay cho thanh toán phiếu
                dịch vụ.
              </p>
              <div className="form-grid">
                <label>
                  Loại giao dịch
                  <select name="kind">
                    <option value="cash_in">Nộp thêm vào quỹ</option>
                    <option value="cash_out">Chi / rút tiền mặt</option>
                  </select>
                </label>
                <label>
                  Số tiền (₫)
                  <input
                    name="amount"
                    type="number"
                    min="1"
                    max="1000000000000"
                    step="1"
                    required
                  />
                </label>
                <label className="full-width">
                  Lý do
                  <input
                    name="note"
                    minLength={3}
                    maxLength={300}
                    required
                    placeholder="Ví dụ: mua vật tư vệ sinh"
                  />
                </label>
              </div>
            </>
          ) : (
            summary && (
              <>
                <p className="dialog-intro">
                  Kiểm đếm tiền mặt và đối chiếu chứng từ chuyển khoản/thẻ. Chỉ đóng ca sau khi đã
                  xác nhận các số dưới đây.
                </p>
                {changed && (
                  <div className="info-strip">
                    Có giao dịch mới trong ca. Hãy xem lại số dự kiến trước khi đóng.
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setVersion(shift!.version)}
                    >
                      Cập nhật số đối soát
                    </button>
                  </div>
                )}
                <div className="reconciliation-fields">
                  {[
                    ['Tiền mặt', summary.expectedCash, cash, setCash],
                    ['Chuyển khoản', summary.expectedTransfer, transfer, setTransfer],
                    ['Thẻ', summary.expectedCard, card, setCard],
                  ].map(([label, expected, value, setter]) => (
                    <label key={String(label)}>
                      <span>
                        {String(label)}
                        <small>Dự kiến: {money(Number(expected))}</small>
                      </span>
                      <input
                        aria-label={'Thực tế ' + String(label)}
                        type="number"
                        min="0"
                        max="1000000000000"
                        step="1"
                        required
                        value={String(value)}
                        onChange={(e) => (setter as (s: string) => void)(e.target.value)}
                      />
                      <small
                        className={
                          Number(value) === Number(expected)
                            ? 'balance-match'
                            : 'balance-difference'
                        }
                      >
                        {value === ''
                          ? 'Chưa nhập'
                          : `Chênh ${money(Number(value) - Number(expected))}`}
                      </small>
                    </label>
                  ))}
                </div>
                <label className="close-note">
                  Ghi chú / lý do chênh lệch
                  <input
                    name="note"
                    minLength={difference ? 5 : 0}
                    maxLength={500}
                    required={!!difference}
                    placeholder={
                      difference ? 'Bắt buộc ghi rõ lý do chênh lệch' : 'Ghi chú bàn giao (nếu có)'
                    }
                  />
                </label>
                <p className="form-note">
                  Sau khi đóng, ca và sổ giao dịch được khóa. Phiên đang chơi có thể tiếp tục; khoản
                  thu sau đó thuộc ca mới.
                </p>
              </>
            )
          )}
          <div className="form-footer">
            <button className="secondary" type="button" disabled={busy} onClick={onClose}>
              Để sau
            </button>
            <button className="primary" disabled={busy || changed || noLongerOpen}>
              {busy ? 'Đang ghi sổ…' : kind === 'close' ? 'Xác nhận đóng ca' : 'Xác nhận ghi sổ'}
            </button>
          </div>
        </form>
      </section>
    </dialog>
  );
}
