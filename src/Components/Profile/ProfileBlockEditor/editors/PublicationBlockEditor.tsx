import React from 'react';
import { PublicationBlock } from '../../types';

interface Props { block: PublicationBlock; onChange: (block: PublicationBlock) => void; }

const PublicationBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const update = (field: string, value: string) => onChange({ ...block, data: { ...block.data, [field]: value } });
  return (
    <div className="block-editor block-publication-editor">
      <input type="text" placeholder="제목" value={block.data.title} onChange={(e) => update('title', e.target.value)} />
      <input type="text" placeholder="저자 (예: 홍길동, 김철수)" value={block.data.authors} onChange={(e) => update('authors', e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" placeholder="학회/저널/컨퍼런스" value={block.data.venue} onChange={(e) => update('venue', e.target.value)} />
        <input type="text" placeholder="발표일 (예: 2025-01)" value={block.data.date} onChange={(e) => update('date', e.target.value)} />
      </div>
      <input type="text" placeholder="URL (선택)" value={block.data.url} onChange={(e) => update('url', e.target.value)} />
      <textarea placeholder="설명 (선택)" value={block.data.description} onChange={(e) => update('description', e.target.value)} rows={2} />
    </div>
  );
};

export default PublicationBlockEditor;
