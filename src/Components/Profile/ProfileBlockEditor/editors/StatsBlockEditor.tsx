import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { StatsBlock, StatItem } from '../../types';

interface Props { block: StatsBlock; onChange: (block: StatsBlock) => void; }

const StatsBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const items = block.data.items || [];

  const updateItem = (index: number, field: keyof StatItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...block, data: { items: newItems } });
  };

  const addItem = () => onChange({ ...block, data: { items: [...items, { label: '', value: '' }] } });
  const removeItem = (index: number) => onChange({ ...block, data: { items: items.filter((_: StatItem, i: number) => i !== index) } });

  return (
    <div className="block-editor block-stats-editor">
      {items.map((item: StatItem, i: number) => (
        <div key={i} className="block-stat-edit-row">
          <input type="text" placeholder="숫자/값 (예: 12개)" value={item.value} onChange={(e) => updateItem(i, 'value', e.target.value)} />
          <input type="text" placeholder="라벨 (예: 프로젝트)" value={item.label} onChange={(e) => updateItem(i, 'label', e.target.value)} />
          <button className="block-skill-remove" onClick={() => removeItem(i)}><Trash2 size={14} /></button>
        </div>
      ))}
      <button className="block-add-item-btn" onClick={addItem}><Plus size={16} /> 항목 추가</button>
    </div>
  );
};

export default StatsBlockEditor;
