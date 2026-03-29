import React from 'react';
import { ActivityBlock } from '../../types';

interface Props { block: ActivityBlock; onChange: (block: ActivityBlock) => void; }

const ActivityBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const update = (field: string, value: any) => onChange({ ...block, data: { ...block.data, [field]: value } });
  return (
    <div className="block-editor block-activity-editor">
      <input type="text" placeholder="활동명" value={block.data.title} onChange={(e) => update('title', e.target.value)} />
      <input type="text" placeholder="기관/단체명" value={block.data.organization} onChange={(e) => update('organization', e.target.value)} />
      <input type="text" placeholder="역할 (예: 팀장, 멘토)" value={block.data.role} onChange={(e) => update('role', e.target.value)} />
      <div className="block-experience-dates">
        <input type="text" placeholder="시작일 (예: 2024-03)" value={block.data.startDate} onChange={(e) => update('startDate', e.target.value)} />
        <span>~</span>
        {block.data.isCurrent ? (
          <span className="block-experience-current">활동 중</span>
        ) : (
          <input type="text" placeholder="종료일 (예: 2025-06)" value={block.data.endDate || ''} onChange={(e) => update('endDate', e.target.value)} />
        )}
        <label className="block-experience-check">
          <input type="checkbox" checked={block.data.isCurrent} onChange={(e) => update('isCurrent', e.target.checked)} />
          활동 중
        </label>
      </div>
      <textarea placeholder="설명 (선택)" value={block.data.description} onChange={(e) => update('description', e.target.value)} rows={2} />
    </div>
  );
};

export default ActivityBlockEditor;
