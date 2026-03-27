import { ProfileBlock } from './types';

export interface BlockTypeInfo {
  type: string;
  label: string;
  icon: string;
  description: string;
  defaultData: () => Omit<ProfileBlock, 'id'>;
}

export const BLOCK_TYPES: BlockTypeInfo[] = [
  {
    type: 'text',
    label: '텍스트',
    icon: 'Type',
    description: '마크다운으로 자유롭게 작성',
    defaultData: () => ({ type: 'text' as const, data: { markdown: '' }, style: {} }),
  },
  {
    type: 'image',
    label: '이미지',
    icon: 'Image',
    description: '이미지 업로드 + 캡션',
    defaultData: () => ({ type: 'image' as const, data: { path: '', url: '', caption: '', alt: '' }, style: { width: 'full' as const } }),
  },
  {
    type: 'links',
    label: '링크',
    icon: 'Link',
    description: 'GitHub, 블로그, SNS 등',
    defaultData: () => ({ type: 'links' as const, data: { items: [{ label: '', url: '', icon: 'globe' }] }, style: {} }),
  },
  {
    type: 'divider',
    label: '구분선',
    icon: 'Minus',
    description: '섹션 구분',
    defaultData: () => ({ type: 'divider' as const, data: {}, style: { variant: 'line' as const } }),
  },
  {
    type: 'project',
    label: '프로젝트',
    icon: 'FolderOpen',
    description: '프로젝트 카드',
    defaultData: () => ({ type: 'project' as const, data: { title: '', description: '', tags: [], url: '', imagePath: '', imageUrl: '' }, style: {} }),
  },
  {
    type: 'experience',
    label: '경력/학력',
    icon: 'Briefcase',
    description: '타임라인 형식 경력 정보',
    defaultData: () => ({ type: 'experience' as const, data: { title: '', organization: '', startDate: '', endDate: null, isCurrent: false, description: '' }, style: {} }),
  },
  {
    type: 'skills',
    label: '기술 스택',
    icon: 'Zap',
    description: '기술 태그/숙련도',
    defaultData: () => ({ type: 'skills' as const, data: { items: [{ name: '', level: 3 }] }, style: { layout: 'tags' as const } }),
  },
  {
    type: 'header',
    label: '섹션 제목',
    icon: 'Heading',
    description: '큰 제목 + 소제목',
    defaultData: () => ({ type: 'header' as const, data: { title: '', subtitle: '' }, style: { align: 'left' as const } }),
  },
  {
    type: 'award',
    label: '수상내역',
    icon: 'Trophy',
    description: '대회/공모전 수상 기록',
    defaultData: () => ({ type: 'award' as const, data: { title: '', organizer: '', date: '', rank: '', description: '' }, style: {} }),
  },
  {
    type: 'certification',
    label: '자격증/수료',
    icon: 'BadgeCheck',
    description: '자격증, 수료증, 라이선스',
    defaultData: () => ({ type: 'certification' as const, data: { name: '', issuer: '', date: '', credentialId: '', url: '' }, style: {} }),
  },
  {
    type: 'education',
    label: '학력',
    icon: 'GraduationCap',
    description: '학교/전공 정보',
    defaultData: () => ({ type: 'education' as const, data: { school: '', degree: '', field: '', startDate: '', endDate: null, isCurrent: false, description: '' }, style: {} }),
  },
  {
    type: 'activity',
    label: '대외활동',
    icon: 'Users',
    description: '동아리/봉사/대외활동',
    defaultData: () => ({ type: 'activity' as const, data: { title: '', organization: '', role: '', startDate: '', endDate: null, isCurrent: false, description: '' }, style: {} }),
  },
  {
    type: 'publication',
    label: '논문/발표',
    icon: 'BookOpen',
    description: '논문, 학회 발표, 출판물',
    defaultData: () => ({ type: 'publication' as const, data: { title: '', venue: '', authors: '', date: '', url: '', description: '' }, style: {} }),
  },
  {
    type: 'contact',
    label: '연락처',
    icon: 'Phone',
    description: '이메일, 전화, 위치 등',
    defaultData: () => ({ type: 'contact' as const, data: { email: '', phone: '', location: '', website: '' }, style: {} }),
  },
  {
    type: 'stats',
    label: '숫자 통계',
    icon: 'BarChart3',
    description: '프로젝트 N개, 수상 N회 등',
    defaultData: () => ({ type: 'stats' as const, data: { items: [{ label: '', value: '' }] }, style: {} }),
  },
];

export function createBlock(type: string): ProfileBlock {
  const info = BLOCK_TYPES.find(b => b.type === type);
  if (!info) throw new Error(`Unknown block type: ${type}`);
  return {
    id: crypto.randomUUID(),
    ...info.defaultData(),
  } as ProfileBlock;
}
