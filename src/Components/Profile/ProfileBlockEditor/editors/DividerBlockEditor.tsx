import React from 'react';
import { DividerBlock } from '../../types';

interface Props {
  block: DividerBlock;
  onChange: (block: DividerBlock) => void;
}

const DividerBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  return (
    <div className="block-editor block-divider-editor">
      <label>스타일: </label>
      <select
        value={block.style?.variant || 'line'}
        onChange={(e) => onChange({ ...block, style: { ...block.style, variant: e.target.value as any } })}
      >
        <option value="line">실선</option>
        <option value="dots">점선</option>
        <option value="space">여백</option>
      </select>
    </div>
  );
};

export default DividerBlockEditor;
