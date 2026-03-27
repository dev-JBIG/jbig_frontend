import React from 'react';
import { AwardBlock } from '../../types';

interface Props { block: AwardBlock; onChange: (block: AwardBlock) => void; }

const AwardBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const update = (field: string, value: string) => onChange({ ...block, data: { ...block.data, [field]: value } });
  return (
    <div className="block-editor block-award-editor">
      <input type="text" placeholder="수상명 (예: 대상, 최우수상)" value={block.data.title} onChange={(e) => update('title', e.target.value)} />
      <input type="text" placeholder="주최 기관" value={block.data.organizer} onChange={(e) => update('organizer', e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" placeholder="수상 등급 (예: 대상, 금상)" value={block.data.rank} onChange={(e) => update('rank', e.target.value)} />
        <input type="month" value={block.data.date} onChange={(e) => update('date', e.target.value)} />
      </div>
      <textarea placeholder="설명 (선택)" value={block.data.description} onChange={(e) => update('description', e.target.value)} rows={2} />
    </div>
  );
};

export default AwardBlockEditor;
