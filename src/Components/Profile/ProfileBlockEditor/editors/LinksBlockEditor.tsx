import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { LinksBlock, LinkItem } from '../../types';

const ICON_OPTIONS = [
  { value: 'github', label: 'GitHub' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'mail', label: 'Email' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'globe', label: '웹사이트' },
  { value: 'external', label: '기타' },
];

interface Props {
  block: LinksBlock;
  onChange: (block: LinksBlock) => void;
}

const LinksBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const items = block.data.items || [];

  const updateItem = (index: number, field: keyof LinkItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...block, data: { items: newItems } });
  };

  const addItem = () => {
    onChange({ ...block, data: { items: [...items, { label: '', url: '', icon: 'globe' }] } });
  };

  const removeItem = (index: number) => {
    onChange({ ...block, data: { items: items.filter((_, i) => i !== index) } });
  };

  return (
    <div className="block-editor block-links-editor">
      {items.map((item, i) => (
        <div key={i} className="block-link-edit-row">
          <select value={item.icon} onChange={(e) => updateItem(i, 'icon', e.target.value)}>
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="라벨"
            value={item.label}
            onChange={(e) => updateItem(i, 'label', e.target.value)}
          />
          <input
            type="text"
            placeholder="https://..."
            value={item.url}
            onChange={(e) => updateItem(i, 'url', e.target.value)}
          />
          <button className="block-link-remove" onClick={() => removeItem(i)}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button className="block-add-item-btn" onClick={addItem}>
        <Plus size={16} /> 링크 추가
      </button>
    </div>
  );
};

export default LinksBlockEditor;
