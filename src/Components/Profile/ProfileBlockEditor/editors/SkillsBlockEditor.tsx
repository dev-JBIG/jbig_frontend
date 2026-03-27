import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SkillsBlock, SkillItem } from '../../types';

interface Props {
  block: SkillsBlock;
  onChange: (block: SkillsBlock) => void;
}

const SkillsBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const items = block.data.items || [];
  const [nameInput, setNameInput] = useState('');

  const updateItem = (index: number, field: keyof SkillItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...block, data: { items: newItems } });
  };

  const addItem = () => {
    const name = nameInput.trim();
    if (!name) return;
    onChange({ ...block, data: { items: [...items, { name, level: 3 }] } });
    setNameInput('');
  };

  const removeItem = (index: number) => {
    onChange({ ...block, data: { items: items.filter((_: SkillItem, i: number) => i !== index) } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="block-editor block-skills-editor">
      <div className="block-skills-layout-select">
        <label>레이아웃: </label>
        <select
          value={block.style?.layout || 'tags'}
          onChange={(e) => onChange({ ...block, style: { ...block.style, layout: e.target.value as any } })}
        >
          <option value="tags">태그</option>
          <option value="bars">바 차트</option>
        </select>
      </div>
      <div className="block-skills-items">
        {items.map((item: SkillItem, i: number) => (
          <div key={i} className="block-skill-edit-row">
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(i, 'name', e.target.value)}
              placeholder="기술명"
            />
            <input
              type="range"
              min={1}
              max={5}
              value={item.level}
              onChange={(e) => updateItem(i, 'level', Number(e.target.value))}
            />
            <span className="block-skill-level">{item.level}/5</span>
            <button className="block-skill-remove" onClick={() => removeItem(i)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="block-skill-add-row">
        <input
          type="text"
          placeholder="기술명 입력 후 Enter"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="block-add-item-btn" onClick={addItem}>
          <Plus size={16} /> 추가
        </button>
      </div>
    </div>
  );
};

export default SkillsBlockEditor;
