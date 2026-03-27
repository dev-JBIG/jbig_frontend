import React from 'react';
import { CertificationBlock } from '../../types';

interface Props { block: CertificationBlock; onChange: (block: CertificationBlock) => void; }

const CertificationBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const update = (field: string, value: string) => onChange({ ...block, data: { ...block.data, [field]: value } });
  return (
    <div className="block-editor block-cert-editor">
      <input type="text" placeholder="자격증/수료증 이름" value={block.data.name} onChange={(e) => update('name', e.target.value)} />
      <input type="text" placeholder="발급 기관" value={block.data.issuer} onChange={(e) => update('issuer', e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="month" value={block.data.date} onChange={(e) => update('date', e.target.value)} />
        <input type="text" placeholder="자격번호 (선택)" value={block.data.credentialId} onChange={(e) => update('credentialId', e.target.value)} />
      </div>
      <input type="text" placeholder="검증 URL (선택)" value={block.data.url} onChange={(e) => update('url', e.target.value)} />
    </div>
  );
};

export default CertificationBlockEditor;
