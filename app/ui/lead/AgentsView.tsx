'use client';
import { useCallback, useEffect, useState } from 'react';
import { call } from './shared';

type Agent = {
  userId: string;
  name: string;
  email: string;
  role: string;
  receivesLeads: boolean;
  onDuty: boolean;
  lastAssigned: number | null;
  zaloId: string;
  notifyEmail: string;
};
export function AgentsView({ manager }: { manager: boolean }) {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [me, setMe] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try {
      const v = (await call('/api/crm/agents')) as unknown as { agents: Agent[]; me: string };
      setAgents(v.agents);
      setMe(v.me);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);
  async function save(body: Record<string, unknown>) {
    setError('');
    setNotice('');
    try {
      await call('/api/crm/agents', body);
      setNotice('Đã lưu');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  if (!agents) return error ? <div className="error-box">{error}</div> : <p>Đang tải…</p>;
  return (
    <div className="crm-flows">
      <p className="muted">
        Lead được chia luân phiên cho nhân viên vừa được bật &quot;Nhận lead&quot; vừa đang trực.
        Nhân viên tự bật &quot;Đang trực&quot; khi vào ca; công tắc tự tắt sau 12 giờ. Email và Zalo
        dùng để báo lead mới và lead quá hạn.
      </p>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Nhận lead</th>
              <th>Đang trực</th>
              <th>Email báo tin</th>
              <th>Zalo ID báo tin</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <AgentRow
                key={a.userId}
                a={a}
                manager={manager}
                self={a.userId === me}
                onSave={save}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function AgentRow({
  a,
  manager,
  self,
  onSave,
}: {
  a: Agent;
  manager: boolean;
  self: boolean;
  onSave: (b: Record<string, unknown>) => void;
}) {
  const [email, setEmail] = useState(a.notifyEmail);
  const [zalo, setZalo] = useState(a.zaloId);
  return (
    <tr>
      <td>
        <strong>{a.name}</strong>
        <br />
        <small>{a.email}</small>
      </td>
      <td>
        <input
          type="checkbox"
          aria-label={`Nhận lead ${a.name}`}
          checked={a.receivesLeads}
          disabled={!manager}
          onChange={(e) =>
            onSave({
              userId: a.userId,
              receivesLeads: e.target.checked,
              ...(e.target.checked ? {} : { onDuty: false }),
            })
          }
        />
      </td>
      <td>
        <input
          type="checkbox"
          aria-label={`Đang trực ${a.name}`}
          checked={a.onDuty}
          disabled={!(manager || self) || !a.receivesLeads}
          onChange={(e) => onSave({ userId: a.userId, onDuty: e.target.checked })}
        />
      </td>
      <td>
        <input
          aria-label={`Email báo tin ${a.name}`}
          value={email}
          placeholder={a.email}
          disabled={!manager && !self}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email !== a.notifyEmail && onSave({ userId: a.userId, email })}
        />
      </td>
      <td>
        <input
          aria-label={`Zalo ID ${a.name}`}
          value={zalo}
          disabled={!manager && !self}
          onChange={(e) => setZalo(e.target.value)}
          onBlur={() => zalo !== a.zaloId && onSave({ userId: a.userId, zaloId: zalo })}
        />
      </td>
    </tr>
  );
}
