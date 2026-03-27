import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { ProfileBlock } from '../types';
import { BLOCK_TYPES } from '../blockTypes';

interface Props {
  block: ProfileBlock;
  children: React.ReactNode;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const SortableBlockWrapper: React.FC<Props> = ({ block, children, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const blockInfo = BLOCK_TYPES.find(b => b.type === block.type);

  return (
    <div ref={setNodeRef} style={style} className={`sortable-block ${isDragging ? 'sortable-block-dragging' : ''}`}>
      <div className="sortable-block-toolbar">
        <button className="sortable-block-drag" {...attributes} {...listeners} title="드래그하여 이동">
          <GripVertical size={18} />
        </button>
        <span className="sortable-block-type">{blockInfo?.label || block.type}</span>
        <div className="sortable-block-actions">
          <button onClick={onMoveUp} disabled={isFirst} title="위로"><ChevronUp size={16} /></button>
          <button onClick={onMoveDown} disabled={isLast} title="아래로"><ChevronDown size={16} /></button>
          {showConfirm ? (
            <span className="sortable-block-confirm">
              <button className="confirm-yes" onClick={onDelete}>삭제</button>
              <button className="confirm-no" onClick={() => setShowConfirm(false)}>취소</button>
            </span>
          ) : (
            <button onClick={() => setShowConfirm(true)} title="삭제"><Trash2 size={16} /></button>
          )}
        </div>
      </div>
      <div className="sortable-block-content">
        {children}
      </div>
    </div>
  );
};

export default SortableBlockWrapper;
