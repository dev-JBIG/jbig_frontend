import React from 'react';
import { Trophy } from 'lucide-react';
import { AwardBlock } from '../../types';

interface Props { block: AwardBlock; }

const AwardBlockView: React.FC<Props> = ({ block }) => {
  const { title, organizer, date, rank, description } = block.data;
  if (!title) return null;
  return (
    <div className="block-view block-award-view">
      <div className="block-award-icon"><Trophy size={20} /></div>
      <div className="block-award-content">
        <h4 className="block-award-title">{title}</h4>
        <div className="block-award-meta">
          {organizer && <span>{organizer}</span>}
          {rank && <span className="block-award-rank">{rank}</span>}
          {date && <span className="block-award-date">{date}</span>}
        </div>
        {description && <p className="block-award-desc">{description}</p>}
      </div>
    </div>
  );
};

export default AwardBlockView;
