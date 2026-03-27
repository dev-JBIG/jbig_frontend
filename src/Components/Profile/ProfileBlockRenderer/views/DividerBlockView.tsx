import React from 'react';
import { DividerBlock } from '../../types';

interface Props {
  block: DividerBlock;
}

const DividerBlockView: React.FC<Props> = ({ block }) => {
  const variant = block.style?.variant || 'line';
  return <div className={`block-view block-divider-view block-divider-${variant}`} />;
};

export default DividerBlockView;
