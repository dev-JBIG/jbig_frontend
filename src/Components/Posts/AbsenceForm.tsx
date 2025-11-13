import React, { useState, useEffect } from 'react';
import { useUser } from '../Utils/UserContext';
import './PostWrite.css'; // 기존 CSS 재활용

interface AbsenceFormProps {
  setContent: (content: string) => void;
  initialContent: string;
}

// 마크다운에서 폼 데이터 추출 (수정 시 사용)
const parseMarkdownToForm = (md: string) => {
  const initialState = {
    reasonType: '결석사유서',
    absenceDate: '',
    institution: '',
    schedule: '',
    location: '',
    reason: '',
  };

  if (!md) return initialState;

  // 정규식을 사용하여 테이블의 각 항목 값을 추출
  const getValue = (key: string) => {
    const regex = new RegExp(`\\| \\*\\*${key}\\*\\* \\| (.*?) \\|`);
    const match = md.match(regex);
    // <br /> 태그를 다시 \n (줄바꿈)으로 복원
    return match ? match[1].replace(/<br \/>/g, '\n') : '';
  };

  return {
    reasonType: md.match(/.* (.*?) 제출합니다\./)?.[1] || '결석사유서',
    absenceDate: getValue('결석 날짜'),
    institution: getValue('관련 기관'),
    schedule: getValue('일정'),
    location: getValue('장소'),
    reason: getValue('결석 사유'),
  };
};

const AbsenceForm: React.FC<AbsenceFormProps> = ({ setContent, initialContent }) => {
  // 1. useUser 훅을 사용해 로그인한 유저 정보 가져오기
  const { user } = useUser();
  // (user 객체 구조에 맞게 수정 필요. user.username, user.name 등)
  const userName = user?.username || '자동입력실패';

  // 2. 폼 데이터를 관리할 state
  const [formState, setFormState] = useState(parseMarkdownToForm(initialContent));

  // 3. 폼 내용이 변경될 때마다 마크다운 텍스트를 생성하여 부모(PostWrite)의 content state 업데이트
  useEffect(() => {
    const { reasonType, absenceDate, institution, schedule, location, reason } = formState;

    // 4. 입력된 줄바꿈(\n)을 HTML <br /> 태그로 변경 (마크다운 테이블 내 줄바꿈)
    const reasonWithBreaks = reason.replace(/\n/g, '<br />');

    const generatedMarkdown = `${userName} ${reasonType} 제출합니다.

| 항목 | 내용 |
| --- | --- |
| **성명** | ${userName} |
| **결석 날짜** | ${absenceDate} |
| **관련 기관** | ${institution} |
| **일정** | ${schedule} |
| **장소** | ${location} |
| **결석 사유** | ${reasonWithBreaks} |
`;
    setContent(generatedMarkdown);
  }, [formState, userName, setContent]);

  // 5. 수정 모드일 때, initialContent가 비동기로 로드되면 폼 상태 업데이트
  useEffect(() => {
    if (initialContent) {
      setFormState(parseMarkdownToForm(initialContent));
    }
  }, [initialContent]);


  // 6. 폼 입력 핸들러
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 7. 렌더링
  return (
    <div className="absence-form-container">
      <div className="absence-form-notice">
        ※ 제출하신 사유서는 본인과 관리자만 확인할 수 있으며, 타인에게는 공개되지 않습니다.
        <br />
        <br />
        ※ 결석 사유서는 특정 기관, 학교관련 일정부터 기본적인 가족모임이나 친구와의 사적 모임까지 허용합니다.
        <br /> 
        ※ 그러나 잦은 사유결석은 이수조건을 채우지 못할 수 있습니다.  주의해주시길 바랍니다.
      </div>

      {/* 사유서 종류 (드롭다운) */}
      <div className="postwrite-row">
        <label htmlFor="reasonType">사유서 종류</label>
        <select
          id="reasonType"
          name="reasonType"
          className="board-select" // 기존 CSS 재활용
          value={formState.reasonType}
          onChange={handleChange}
        >
          <option value="결석사유서">결석사유서</option>
          {/* <option value="조퇴사유서">조퇴사유서</option> */}
          {/* <option value="기타사유서">기타사유서</option> */}
        </select>
      </div>

      {/* 성명 (자동 입력) */}
      <div className="postwrite-row">
        <label htmlFor="userName">성명</label>
        <input
          id="userName"
          name="userName"
          className="postwrite-title-input" // 기존 CSS 재활용
          type="text"
          value={userName}
          readOnly
          disabled
        />
      </div>

      {/* 결석 날짜 */}
      <div className="postwrite-row">
        <label htmlFor="absenceDate">결석 날짜</label>
        <input
          id="absenceDate"
          name="absenceDate"
          className="postwrite-title-input"
          type="date"
          value={formState.absenceDate}
          onChange={handleChange}
        />
      </div>

      {/* 관련 기관 */}
      <div className="postwrite-row">
        <label htmlFor="institution">관련 기관</label>
        <input
          id="institution"
          name="institution"
          className="postwrite-title-input"
          type="text"
          placeholder="관련 기관을 입력하세요."
          value={formState.institution}
          onChange={handleChange}
        />
      </div>
      
      {/* 일정 */}
      <div className="postwrite-row">
        <label htmlFor="schedule">일정</label>
        <input
          id="schedule"
          name="schedule"
          className="postwrite-title-input"
          type="text"
          placeholder="예: 예비군 훈련, 병원 진료 등"
          value={formState.schedule}
          onChange={handleChange}
        />
      </div>

      {/* 장소 */}
      <div className="postwrite-row">
        <label htmlFor="location">장소</label>
        <input
          id="location"
          name="location"
          className="postwrite-title-input"
          type="text"
          placeholder="장소를 입력하세요."
          value={formState.location}
          onChange={handleChange}
        />
      </div>

      {/* 결석 사유 (여러 줄) */}
      <div className="postwrite-row">
        <label htmlFor="reason">결석 사유</label>
        <textarea
          id="reason"
          name="reason"
          className="postwrite-title-input" // 임시로 재활용 (CSS 수정 필요할 수 있음)
          rows={6}
          placeholder="결석 사유를 입력하세요."
          value={formState.reason}
          onChange={handleChange}
          style={{ height: '120px', resize: 'vertical' }}
        />
      </div>
    </div>
  );
};

export default AbsenceForm;
