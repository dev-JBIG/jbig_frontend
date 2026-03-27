import React from 'react';
import { EducationBlock } from '../../types';

interface Props { block: EducationBlock; onChange: (block: EducationBlock) => void; }

const EducationBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const update = (field: string, value: any) => onChange({ ...block, data: { ...block.data, [field]: value } });
  return (
    <div className="block-editor block-education-editor">
      <input type="text" placeholder="학교명" value={block.data.school} onChange={(e) => update('school', e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" placeholder="학위 (예: 학사, 석사)" value={block.data.degree} onChange={(e) => update('degree', e.target.value)} />
        <input type="text" placeholder="전공/학과" value={block.data.field} onChange={(e) => update('field', e.target.value)} />
      </div>
      <div className="block-experience-dates">
        <input type="month" value={block.data.startDate} onChange={(e) => update('startDate', e.target.value)} />
        <span>~</span>
        {block.data.isCurrent ? (
          <span className="block-experience-current">재학 중</span>
        ) : (
          <input type="month" value={block.data.endDate || ''} onChange={(e) => update('endDate', e.target.value)} />
        )}
        <label className="block-experience-check">
          <input type="checkbox" checked={block.data.isCurrent} onChange={(e) => update('isCurrent', e.target.checked)} />
          재학 중
        </label>
      </div>
      <textarea placeholder="설명 (선택)" value={block.data.description} onChange={(e) => update('description', e.target.value)} rows={2} />
    </div>
  );
};

export default EducationBlockEditor;
