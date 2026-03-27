import React from 'react';
import { HeaderBlock } from '../../types';

interface Props { block: HeaderBlock; onChange: (block: HeaderBlock) => void; }

const HeaderBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const update = (field: string, value: any) => onChange({ ...block, data: { ...block.data, [field]: value } });
  return (
    <div className="block-editor block-header-editor">
      <input type="text" placeholder="섹션 제목" value={block.data.title} onChange={(e) => update('title', e.target.value)} style={{ fontSize: '1.1em', fontWeight: 600 }} />
      <input type="text" placeholder="소제목 (선택)" value={block.data.subtitle} onChange={(e) => update('subtitle', e.target.value)} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: '0.85em', color: '#64748b' }}>정렬:</label>
        <select value={block.style?.align || 'left'} onChange={(e) => onChange({ ...block, style: { ...block.style, align: e.target.value as any } })} style={{ width: 'auto', marginBottom: 0 }}>
          <option value="left">왼쪽</option>
          <option value="center">가운데</option>
        </select>
      </div>
    </div>
  );
};

export default HeaderBlockEditor;
