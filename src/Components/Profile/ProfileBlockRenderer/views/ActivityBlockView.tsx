import React from 'react';
import { ActivityBlock } from '../../types';

interface Props { block: ActivityBlock; }

const ActivityBlockView: React.FC<Props> = ({ block }) => {
  const { title, organization, role, startDate, endDate, isCurrent, description } = block.data;
  if (!title) return null;
  const period = isCurrent ? `${startDate} ~ 현재` : `${startDate} ~ ${endDate || ''}`;
  return (
    <div className="block-view block-activity-view">
      <div className="block-activity-timeline" />
      <div className="block-activity-content">
        <h4 className="block-activity-title">{title}</h4>
        {organization && <p className="block-activity-org">{organization}</p>}
        {role && <p className="block-activity-role">{role}</p>}
        <p className="block-activity-period">{period}</p>
        {description && <p className="block-activity-desc">{description}</p>}
      </div>
    </div>
  );
};

export default ActivityBlockView;
