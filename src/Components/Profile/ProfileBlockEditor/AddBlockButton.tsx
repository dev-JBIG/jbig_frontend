import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { BLOCK_TYPES } from '../blockTypes';

interface Props {
  onAddBlock: (type: string) => void;
}

const AddBlockButton: React.FC<Props> = ({ onAddBlock }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="add-block-inline">
      <button className="add-block-btn" onClick={() => setOpen(!open)}>
        <Plus size={14} />
      </button>
      {open && (
        <div className="add-block-menu">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              className="add-block-menu-item"
              onClick={() => { onAddBlock(bt.type); setOpen(false); }}
            >
              {bt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddBlockButton;
