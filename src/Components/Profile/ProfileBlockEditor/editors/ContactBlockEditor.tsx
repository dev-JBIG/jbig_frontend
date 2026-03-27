import React from 'react';
import { ContactBlock } from '../../types';

interface Props { block: ContactBlock; onChange: (block: ContactBlock) => void; }

const ContactBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const update = (field: string, value: string) => onChange({ ...block, data: { ...block.data, [field]: value } });
  return (
    <div className="block-editor block-contact-editor">
      <input type="email" placeholder="이메일" value={block.data.email} onChange={(e) => update('email', e.target.value)} />
      <input type="tel" placeholder="전화번호" value={block.data.phone} onChange={(e) => update('phone', e.target.value)} />
      <input type="text" placeholder="위치 (예: 서울시 강남구)" value={block.data.location} onChange={(e) => update('location', e.target.value)} />
      <input type="text" placeholder="웹사이트 URL" value={block.data.website} onChange={(e) => update('website', e.target.value)} />
    </div>
  );
};

export default ContactBlockEditor;
