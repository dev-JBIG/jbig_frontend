import React, { useState, useEffect, useRef } from 'react'; // useRef 추가
import MDEditor from '@uiw/react-md-editor';
import { safeSanitizePlugin } from '../Utils/safeMarkdown';
import './PostWrite.css';

interface StudyFormProps {
  setContent: (content: string) => void;
  initialContent: string;
}

const parseMarkdownToForm = (md: string) => {
  const initialState = {
    leaderIntro: '',
    groupName: '',
    studyType: '학술',
    deadline: '',
    isDeadlineTbd: false,
    duration: '',
    headcount: '',
    schedule: '',
    plan: '',
  };

  if (!md) return initialState;

  const getValue = (key: string) => {
    const regex = new RegExp(`\\| \\*\\*${key}\\*\\* \\| (.*?) \\|`);
    const match = md.match(regex);
    return match ? match[1].replace(/<br \/>/g, '\n') : '';
  };

  const deadlineValue = getValue('지원 마감일');
  const planSplit = md.split('## 활동 계획');
  const planContent = planSplit.length > 1 ? planSplit[1].trimStart() : '';

  return {
    leaderIntro: getValue('소모임장 소개'),
    groupName: getValue('소모임 이름'),
    studyType: getValue('분류') || '학술',
    deadline: deadlineValue === '미정' ? '' : deadlineValue,
    isDeadlineTbd: deadlineValue === '미정',
    duration: getValue('활동 기간'),
    headcount: getValue('활동 예상 인원'),
    schedule: getValue('모임 장소 및 시간'),
    plan: planContent,
  };
};

const StudyForm: React.FC<StudyFormProps> = ({ setContent, initialContent }) => {
  const [formState, setFormState] = useState(parseMarkdownToForm(initialContent));

  const lastGeneratedRef = useRef('');

  useEffect(() => {
    const {
      leaderIntro,
      groupName,
      studyType,
      deadline,
      isDeadlineTbd,
      duration,
      headcount,
      schedule,
      plan,
    } = formState;

    const introWithBreaks = leaderIntro.replace(/\n/g, '<br />');
    const finalDeadline = isDeadlineTbd ? '미정' : deadline;

    // [핵심 변경] 표의 정렬을 가운데로 설정합니다 (:---:)
    const generatedMarkdown = `[${studyType}] ${groupName} 모집합니다.

| 항목 | 내용 |
| :---: | :---: |
| **소모임 이름** | ${groupName} |
| **분류** | ${studyType} |
| **소모임장 소개** | ${introWithBreaks} |
| **지원 마감일** | ${finalDeadline} |
| **활동 기간** | ${duration} |
| **활동 예상 인원** | ${headcount} |
| **모임 장소 및 시간** | ${schedule} |

<br />

## 활동 계획
${plan}
`;
    lastGeneratedRef.current = generatedMarkdown;
    setContent(generatedMarkdown);
  }, [formState, setContent]);

  useEffect(() => {
    if (!initialContent) return;

    if (initialContent === lastGeneratedRef.current) return;

    const nextState = parseMarkdownToForm(initialContent);

    setFormState((prev) => {
      // 💡 핵심: 현재 상태(prev)와 새로 파싱한 상태(nextState)가 완전히 똑같다면?
      // 굳이 업데이트를 하지 않아서(return prev) 무한 렌더링을 끊어줍니다.
      if (JSON.stringify(prev) === JSON.stringify(nextState)) {
        return prev;
      }
      return nextState;
    });
  }, [initialContent]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setFormState((prev) => ({
      ...prev,
      isDeadlineTbd: checked,
      deadline: checked ? '' : prev.deadline,
    }));
  };

  return (
    <div className="study-form-container">
       <div className="absence-form-notice">
        ※ 스터디/소모임 모집 양식입니다. 활동 계획은 마크다운으로 자유롭게 작성 가능합니다.
      </div>

      <div className="postwrite-row">
        <label htmlFor="leaderIntro">소모임장 소개</label>
        <textarea
          id="leaderIntro"
          name="leaderIntro"
          className="postwrite-title-input"
          rows={3}
          placeholder="간단한 자기소개를 입력해주세요.
          예시) OOO학과 n기 OOO입니다. ~에 관심이 있습니다. 등"
          value={formState.leaderIntro}
          onChange={handleChange}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="postwrite-row">
        <label htmlFor="groupName">소모임 이름</label>
        <input
          id="groupName"
          name="groupName"
          className="postwrite-title-input"
          type="text"
          placeholder="소모임 이름을 입력해주세요."
          value={formState.groupName}
          onChange={handleChange}
        />
      </div>

      <div className="postwrite-row">
        <label htmlFor="studyType">분류</label>
        <select
          id="studyType"
          name="studyType"
          className="board-select"
          value={formState.studyType}
          onChange={handleChange}
        >
          <option value="학술">학술</option>
          <option value="친목">친목</option>
          <option value="프로젝트">프로젝트</option>
          <option value="기타">기타</option>
        </select>
      </div>

      <div className="postwrite-row">
        <label htmlFor="deadline">지원 마감일</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <input
            id="deadline"
            name="deadline"
            className="postwrite-title-input"
            type="date"
            value={formState.deadline}
            onChange={handleChange}
            disabled={formState.isDeadlineTbd}
            style={{ flex: 1 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={formState.isDeadlineTbd}
              onChange={handleCheckboxChange}
              style={{ marginRight: '5px' }}
            />
            미정(상시)
          </label>
        </div>
      </div>

      <div className="postwrite-row">
        <label htmlFor="duration">활동 기간</label>
        <input
          id="duration"
          name="duration"
          className="postwrite-title-input"
          type="text"
          placeholder="예: 3개월, 이번 학기 동안 등"
          value={formState.duration}
          onChange={handleChange}
        />
      </div>

      <div className="postwrite-row">
        <label htmlFor="headcount">활동 예상 인원</label>
        <input
          id="headcount"
          name="headcount"
          className="postwrite-title-input"
          type="text"
          placeholder="예: 4~6명"
          value={formState.headcount}
          onChange={handleChange}
        />
      </div>

      <div className="postwrite-row">
        <label htmlFor="schedule">모임 장소/시간</label>
        <input
          id="schedule"
          name="schedule"
          className="postwrite-title-input"
          type="text"
          placeholder="예: 매주 목요일 18시 / 학교 근처 카페 / 필요할 때만 만남 등"
          value={formState.schedule}
          onChange={handleChange}
        />
      </div>

      <div className="postwrite-row">
        <label style={{ fontWeight: 'bold' }}>활동 계획 (본문)</label>
        <div className="content-body">
          <MDEditor
            value={formState.plan}
            onChange={(val) => setFormState(prev => ({ ...prev, plan: val || '' }))}
            data-color-mode="light"
            height={300}
            preview="edit"
            previewOptions={{ rehypePlugins: [safeSanitizePlugin] }}
          />
        </div>
      </div>
    </div>
  );
};

export default StudyForm;