'use client';
import { useState } from 'react';
import { Chips, FilterBar, PageTabs } from './kit';
import { LeadsView, AgentsView, ChannelsView, LeadReportView } from './LeadPanel';
import { TasksView } from './crm/TasksView';
import { CustomersView } from './crm/CustomersView';
import { FlowsView } from './crm/FlowsView';

export function CrmPanel({
  permissions,
  initialCustomer = null,
}: {
  permissions: string[];
  initialCustomer?: string | null;
}) {
  const canWork = permissions.includes('crm.work');
  const canManage = permissions.includes('crm.manage');
  const [tab, setTab] = useState<'leads' | 'tasks' | 'customers' | 'report' | 'setup'>(
    initialCustomer ? 'customers' : 'leads',
  );
  const [setup, setSetup] = useState<'agents' | 'channels' | 'flows'>('agents');
  const [focus, setFocus] = useState<string | null>(initialCustomer);
  return (
    <section className="crm-panel">
      <PageTabs
        sub
        value={tab}
        onChange={(k) => setTab(k as typeof tab)}
        tabs={[
          { key: 'leads', label: 'Lead mới' },
          { key: 'tasks', label: 'Việc cần làm' },
          { key: 'customers', label: 'Hồ sơ khách' },
          { key: 'report', label: 'Báo cáo tư vấn', hidden: !canManage },
          { key: 'setup', label: 'Thiết lập' },
        ]}
      />
      {tab === 'leads' && (
        <LeadsView
          canWork={canWork}
          manager={canManage}
          onOpenCustomer={(id) => {
            setFocus(id);
            setTab('customers');
          }}
        />
      )}
      {tab === 'tasks' && (
        <TasksView
          canWork={canWork}
          onOpenCustomer={(id) => {
            setFocus(id);
            setTab('customers');
          }}
        />
      )}
      {tab === 'customers' && (
        <CustomersView key={focus ?? 'all'} canWork={canWork} focus={focus} />
      )}
      {tab === 'report' && canManage && <LeadReportView />}
      {tab === 'setup' && (
        <>
          <FilterBar>
            <Chips
              value={setup}
              onChange={(k) => setSetup(k as typeof setup)}
              options={[
                { key: 'agents', label: 'Nhân sự nhận lead' },
                { key: 'channels', label: 'Kênh & tích hợp' },
                ...(canManage ? [{ key: 'flows', label: 'Quy trình tự động' }] : []),
              ]}
            />
          </FilterBar>
          {setup === 'agents' && <AgentsView manager={canManage} />}
          {setup === 'channels' && <ChannelsView manager={canManage} />}
          {setup === 'flows' && canManage && <FlowsView />}
        </>
      )}
    </section>
  );
}
