import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { ProfileBlock } from '../types';
import { createBlock } from '../blockTypes';
import SortableBlockWrapper from './SortableBlockWrapper';
import BlockToolbar from './BlockToolbar';
import AddBlockButton from './AddBlockButton';
import TextBlockEditor from './editors/TextBlockEditor';
import ImageBlockEditor from './editors/ImageBlockEditor';
import LinksBlockEditor from './editors/LinksBlockEditor';
import DividerBlockEditor from './editors/DividerBlockEditor';
import ProjectBlockEditor from './editors/ProjectBlockEditor';
import ExperienceBlockEditor from './editors/ExperienceBlockEditor';
import SkillsBlockEditor from './editors/SkillsBlockEditor';
import HeaderBlockEditor from './editors/HeaderBlockEditor';
import AwardBlockEditor from './editors/AwardBlockEditor';
import CertificationBlockEditor from './editors/CertificationBlockEditor';
import EducationBlockEditor from './editors/EducationBlockEditor';
import ActivityBlockEditor from './editors/ActivityBlockEditor';
import PublicationBlockEditor from './editors/PublicationBlockEditor';
import ContactBlockEditor from './editors/ContactBlockEditor';
import StatsBlockEditor from './editors/StatsBlockEditor';
import './ProfileBlockEditor.css';

const EDITOR_MAP: Record<string, React.FC<{ block: any; onChange: (b: any) => void }>> = {
  text: TextBlockEditor,
  image: ImageBlockEditor,
  links: LinksBlockEditor,
  divider: DividerBlockEditor,
  project: ProjectBlockEditor,
  experience: ExperienceBlockEditor,
  skills: SkillsBlockEditor,
  header: HeaderBlockEditor,
  award: AwardBlockEditor,
  certification: CertificationBlockEditor,
  education: EducationBlockEditor,
  activity: ActivityBlockEditor,
  publication: PublicationBlockEditor,
  contact: ContactBlockEditor,
  stats: StatsBlockEditor,
};

interface Props {
  blocks: ProfileBlock[];
  onSave: (blocks: ProfileBlock[]) => void;
  onCancel: () => void;
  saving: boolean;
}

const ProfileBlockEditor: React.FC<Props> = ({ blocks: initialBlocks, onSave, onCancel, saving }) => {
  const [blocks, setBlocks] = useState<ProfileBlock[]>(initialBlocks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    setBlocks(arrayMove(blocks, oldIndex, newIndex));
  };

  const updateBlock = (index: number, updated: ProfileBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updated;
    setBlocks(newBlocks);
  };

  const addBlock = (type: string, afterIndex?: number) => {
    const newBlock = createBlock(type);
    const newBlocks = [...blocks];
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : blocks.length;
    newBlocks.splice(insertAt, 0, newBlock);
    setBlocks(newBlocks);
  };

  const deleteBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    setBlocks(arrayMove(blocks, index, newIndex));
  };

  return (
    <div className="profile-block-editor">
      <div className="profile-block-editor-header">
        <BlockToolbar onAddBlock={(type) => addBlock(type)} />
        <div className="profile-block-editor-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={saving}>취소</button>
          <button className="btn-save" onClick={() => onSave(blocks)} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, index) => {
            const Editor = EDITOR_MAP[block.type];
            if (!Editor) return null;
            return (
              <React.Fragment key={block.id}>
                <SortableBlockWrapper
                  block={block}
                  onDelete={() => deleteBlock(index)}
                  onMoveUp={() => moveBlock(index, -1)}
                  onMoveDown={() => moveBlock(index, 1)}
                  isFirst={index === 0}
                  isLast={index === blocks.length - 1}
                >
                  <Editor block={block} onChange={(updated) => updateBlock(index, updated)} />
                </SortableBlockWrapper>
                <AddBlockButton onAddBlock={(type) => addBlock(type, index)} />
              </React.Fragment>
            );
          })}
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <div className="profile-block-editor-empty">
          <p>블록을 추가하여 프로필을 꾸며보세요!</p>
          <BlockToolbar onAddBlock={(type) => addBlock(type)} />
        </div>
      )}

      <div className="profile-block-editor-footer">
        <button className="btn-cancel" onClick={onCancel} disabled={saving}>취소</button>
        <button className="btn-save" onClick={() => onSave(blocks)} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
};

export default ProfileBlockEditor;
