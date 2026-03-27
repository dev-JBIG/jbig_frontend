import React from 'react';
import { SkillsBlock } from '../../types';

interface Props {
  block: SkillsBlock;
}

const SkillsBlockView: React.FC<Props> = ({ block }) => {
  const { items } = block.data;
  const layout = block.style?.layout || 'tags';

  if (!items || items.length === 0) return null;

  if (layout === 'bars') {
    return (
      <div className="block-view block-skills-view block-skills-bars">
        {items.map((item, i) => (
          <div key={i} className="block-skill-bar-row">
            <span className="block-skill-name">{item.name}</span>
            <div className="block-skill-bar">
              <div className="block-skill-bar-fill" style={{ width: `${(item.level / 5) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="block-view block-skills-view block-skills-tags">
      {items.map((item, i) => (
        <span key={i} className="block-skill-tag">
          {item.name}
        </span>
      ))}
    </div>
  );
};

export default SkillsBlockView;
