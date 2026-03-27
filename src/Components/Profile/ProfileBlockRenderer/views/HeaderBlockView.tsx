import React from 'react';
import { HeaderBlock } from '../../types';

interface Props { block: HeaderBlock; }

const HeaderBlockView: React.FC<Props> = ({ block }) => {
  const align = block.style?.align || 'left';
  return (
    <div className={`block-view block-header-view block-header-${align}`}>
      <h2 className="block-header-title">{block.data.title}</h2>
      {block.data.subtitle && <p className="block-header-subtitle">{block.data.subtitle}</p>}
    </div>
  );
};

export default HeaderBlockView;
