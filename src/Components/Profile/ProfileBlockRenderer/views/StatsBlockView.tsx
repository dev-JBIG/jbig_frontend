import React from 'react';
import { StatsBlock } from '../../types';

interface Props { block: StatsBlock; }

const StatsBlockView: React.FC<Props> = ({ block }) => {
  const { items } = block.data;
  if (!items || items.length === 0) return null;
  return (
    <div className="block-view block-stats-view">
      {items.map((item, i) => (
        <div key={i} className="block-stat-item">
          <span className="block-stat-value">{item.value}</span>
          <span className="block-stat-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default StatsBlockView;
