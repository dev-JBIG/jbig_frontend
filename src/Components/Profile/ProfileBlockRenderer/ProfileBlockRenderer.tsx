import React from 'react';
import { ProfileBlock } from '../types';
import TextBlockView from './views/TextBlockView';
import ImageBlockView from './views/ImageBlockView';
import LinksBlockView from './views/LinksBlockView';
import DividerBlockView from './views/DividerBlockView';
import ProjectBlockView from './views/ProjectBlockView';
import ExperienceBlockView from './views/ExperienceBlockView';
import SkillsBlockView from './views/SkillsBlockView';
import HeaderBlockView from './views/HeaderBlockView';
import AwardBlockView from './views/AwardBlockView';
import CertificationBlockView from './views/CertificationBlockView';
import EducationBlockView from './views/EducationBlockView';
import ActivityBlockView from './views/ActivityBlockView';
import PublicationBlockView from './views/PublicationBlockView';
import ContactBlockView from './views/ContactBlockView';
import StatsBlockView from './views/StatsBlockView';
import './ProfileBlockRenderer.css';

interface Props {
  blocks: ProfileBlock[];
}

const BLOCK_COMPONENTS: Record<string, React.FC<{ block: any }>> = {
  text: TextBlockView,
  image: ImageBlockView,
  links: LinksBlockView,
  divider: DividerBlockView,
  project: ProjectBlockView,
  experience: ExperienceBlockView,
  skills: SkillsBlockView,
  header: HeaderBlockView,
  award: AwardBlockView,
  certification: CertificationBlockView,
  education: EducationBlockView,
  activity: ActivityBlockView,
  publication: PublicationBlockView,
  contact: ContactBlockView,
  stats: StatsBlockView,
};

// 좌측 사이드바로 가는 블록 타입 (요약·메타 성격)
const LEFT_COLUMN_TYPES = new Set([
  'contact',
  'skills',
  'certification',
  'links',
  'stats',
]);

const renderBlock = (block: ProfileBlock) => {
  const Component = BLOCK_COMPONENTS[block.type];
  if (!Component) return null;
  const bg = (block.style as any)?.backgroundColor;
  return (
    <div
      key={block.id}
      className={`profile-block-wrapper block-${block.type}`}
      style={bg ? { backgroundColor: bg } : undefined}
    >
      <Component block={block} />
    </div>
  );
};

const ProfileBlockRenderer: React.FC<Props> = ({ blocks }) => {
  if (!blocks || blocks.length === 0) return null;

  // identity 블록은 헤더로 호이스트되므로 본문에서는 스킵
  const visible = blocks.filter((b) => b.type !== 'identity');
  if (visible.length === 0) return null;

  const left: ProfileBlock[] = [];
  const right: ProfileBlock[] = [];
  for (const b of visible) {
    if (LEFT_COLUMN_TYPES.has(b.type)) left.push(b);
    else right.push(b);
  }

  // 좌측이 비어 있으면 단일 컬럼으로 렌더 (불필요한 grid 칸 방지)
  if (left.length === 0) {
    return (
      <div className="profile-blocks-renderer single-column">
        {right.map(renderBlock)}
      </div>
    );
  }

  return (
    <div className="profile-blocks-renderer two-column">
      <aside className="resume-sidebar">
        {left.map(renderBlock)}
      </aside>
      <main className="resume-main">
        {right.map(renderBlock)}
      </main>
    </div>
  );
};

export default ProfileBlockRenderer;
