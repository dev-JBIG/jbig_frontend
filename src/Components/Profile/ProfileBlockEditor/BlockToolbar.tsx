import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { BLOCK_TYPES } from '../blockTypes';

interface Props {
  onAddBlock: (type: string) => void;
}

const BlockToolbar: React.FC<Props> = ({ onAddBlock }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="block-toolbar">
      <button className="block-toolbar-add" onClick={() => setOpen(!open)}>
        <Plus size={18} />
        블록 추가
      </button>
      {open && (
        <div className="block-toolbar-menu">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              className="block-toolbar-menu-item"
              onClick={() => { onAddBlock(bt.type); setOpen(false); }}
            >
              <span className="block-toolbar-menu-label">{bt.label}</span>
              <span className="block-toolbar-menu-desc">{bt.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockToolbar;
