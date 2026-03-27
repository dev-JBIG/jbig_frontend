import React from 'react';
import { GraduationCap } from 'lucide-react';
import { EducationBlock } from '../../types';

interface Props { block: EducationBlock; }

const EducationBlockView: React.FC<Props> = ({ block }) => {
  const { school, degree, field, startDate, endDate, isCurrent, description } = block.data;
  if (!school) return null;
  const period = isCurrent ? `${startDate} ~ 현재` : `${startDate} ~ ${endDate || ''}`;
  return (
    <div className="block-view block-education-view">
      <div className="block-education-icon"><GraduationCap size={20} /></div>
      <div className="block-education-content">
        <h4 className="block-education-school">{school}</h4>
        {(degree || field) && (
          <p className="block-education-degree">{[degree, field].filter(Boolean).join(' · ')}</p>
        )}
        <p className="block-education-period">{period}</p>
        {description && <p className="block-education-desc">{description}</p>}
      </div>
    </div>
  );
};

export default EducationBlockView;
