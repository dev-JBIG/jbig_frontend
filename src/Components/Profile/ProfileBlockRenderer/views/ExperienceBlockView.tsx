import React from 'react';
import { ExperienceBlock } from '../../types';

interface Props {
  block: ExperienceBlock;
}

const ExperienceBlockView: React.FC<Props> = ({ block }) => {
  const { title, organization, startDate, endDate, isCurrent, description } = block.data;
  if (!title) return null;

  const formatDate = (d: string) => d || '';
  const period = isCurrent
    ? `${formatDate(startDate)} ~ 현재`
    : `${formatDate(startDate)} ~ ${formatDate(endDate || '')}`;

  return (
    <div className="block-view block-experience-view">
      <div className="block-experience-timeline" />
      <div className="block-experience-content">
        <h4 className="block-experience-title">{title}</h4>
        {organization && <p className="block-experience-org">{organization}</p>}
        <p className="block-experience-period">{period}</p>
        {description && <p className="block-experience-desc">{description}</p>}
      </div>
    </div>
  );
};

export default ExperienceBlockView;
