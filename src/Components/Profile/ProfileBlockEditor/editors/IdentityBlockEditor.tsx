import React from 'react';
import { IdentityBlock } from '../../types';

interface Props {
  block: IdentityBlock;
  onChange: (block: IdentityBlock) => void;
}

const IdentityBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const update = (field: keyof IdentityBlock['data'], value: string) =>
    onChange({ ...block, data: { ...block.data, [field]: value } });

  return (
    <div className="block-editor block-identity-editor">
      <div style={{ fontSize: '0.8em', color: '#64748b', marginBottom: 8 }}>
        이 블록의 내용은 본문이 아닌 페이지 상단 헤더에 표시됩니다.
      </div>
      <input
        type="text"
        placeholder="실명 (예: 홍길동)"
        value={block.data.realName}
        onChange={(e) => update('realName', e.target.value)}
        style={{ fontSize: '1.05em', fontWeight: 600 }}
      />
      <input
        type="text"
        placeholder="한 줄 소개 (예: 백엔드 개발자 · 분산시스템 관심)"
        value={block.data.headline}
        onChange={(e) => update('headline', e.target.value)}
      />
      <input
        type="url"
        placeholder="프로필 사진 URL (선택)"
        value={block.data.photoUrl}
        onChange={(e) => update('photoUrl', e.target.value)}
      />
      <input
        type="text"
        placeholder="거주 도시 (예: 서울)"
        value={block.data.location}
        onChange={(e) => update('location', e.target.value)}
      />
    </div>
  );
};

export default IdentityBlockEditor;
