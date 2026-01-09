import React, { useState, useEffect } from 'react';
import { useUser } from '../Utils/UserContext';
import './PostWrite.css'; // 기존 CSS 재활용

interface FeedbackFormProps {
  setContent: (content: string) => void;
  initialContent: string;
}

// 마크다운에서 폼 데이터 추출 (수정 시 사용)
const parseMarkdownToForm = (md: string) => {
  const initialState = {
    reasonType: '에러/피드백 제보',
    reportType: '에러',
    reportDate: '',
    reportTime: '',
    location: '',
    description: '',
    reproductionSteps: '',
    expectedBehavior: '',
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
    reasonType: md.match(/.* (.*?) 제출합니다\./)?.[1] || '에러/피드백 제보',
    reportType: getValue('제보 유형') || '에러',
    reportDate: getValue('발생 날짜') || '',
    reportTime: getValue('발생 시간') || '',
    location: getValue('발생 위치/페이지') || '',
    description: getValue('상세 내용') || '',
    reproductionSteps: getValue('재현 방법') || '',
    expectedBehavior: getValue('기대 동작') || '',
  };
};

const FeedbackForm: React.FC<FeedbackFormProps> = ({ setContent, initialContent }) => {
  // 1. useUser 훅을 사용해 로그인한 유저 정보 가져오기
  const { user } = useUser();
  const userName = user?.username || '자동입력실패';

  // 2. 폼 데이터를 관리할 state
  const [formState, setFormState] = useState(parseMarkdownToForm(initialContent));

  // 3. 폼 내용이 변경될 때마다 마크다운 텍스트를 생성하여 부모(PostWrite)의 content state 업데이트
  useEffect(() => {
    const { reasonType, reportType, reportDate, reportTime, location, description, reproductionSteps, expectedBehavior } = formState;

    // 4. 입력된 줄바꿈(\n)을 HTML <br /> 태그로 변경 (마크다운 테이블 내 줄바꿈)
    const descriptionWithBreaks = description.replace(/\n/g, '<br />');
    const reproductionStepsWithBreaks = reproductionSteps.replace(/\n/g, '<br />');
    const expectedBehaviorWithBreaks = expectedBehavior.replace(/\n/g, '<br />');

    const generatedMarkdown = `${userName} ${reasonType} 제출합니다.

| 항목 | 내용 |
| --- | --- |
| **성명** | ${userName} |
| **제보 유형** | ${reportType} |
| **발생 날짜** | ${reportDate} |
| **발생 시간** | ${reportTime} |
| **발생 위치/페이지** | ${location} |
| **상세 내용** | ${descriptionWithBreaks} |
${reportType === '에러' ? `| **재현 방법** | ${reproductionStepsWithBreaks} |\n| **기대 동작** | ${expectedBehaviorWithBreaks} |` : ''}
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
        ※ 제보하신 내용은 관리자가 확인하여 빠르게 처리하겠습니다.
        <br />
        <br />
        ※ 에러 제보 시 가능한 한 상세한 정보(재현 방법, 스크린샷 등)를 제공해주시면 더 빠른 해결이 가능합니다.
        <br /> 
        ※ 피드백 제보 시 구체적인 개선 사항을 작성해주시면 서비스 개선에 큰 도움이 됩니다.
      </div>

      {/* 제보 유형 (드롭다운) */}
      <div className="postwrite-row">
        <label htmlFor="reportType">제보 유형</label>
        <select
          id="reportType"
          name="reportType"
          className="board-select"
          value={formState.reportType}
          onChange={handleChange}
        >
          <option value="에러">에러</option>
          <option value="피드백">피드백</option>
        </select>
      </div>

      {/* 성명 (자동 입력) */}
      <div className="postwrite-row">
        <label htmlFor="userName">성명</label>
        <input
          id="userName"
          name="userName"
          className="postwrite-title-input"
          type="text"
          value={userName}
          readOnly
          disabled
        />
      </div>

      {/* 발생 날짜 */}
      <div className="postwrite-row">
        <label htmlFor="reportDate">발생 날짜</label>
        <input
          id="reportDate"
          name="reportDate"
          className="postwrite-title-input"
          type="date"
          value={formState.reportDate}
          onChange={handleChange}
        />
      </div>

      {/* 발생 시간 */}
      <div className="postwrite-row">
        <label htmlFor="reportTime">발생 시간</label>
        <input
          id="reportTime"
          name="reportTime"
          className="postwrite-title-input"
          type="time"
          value={formState.reportTime}
          onChange={handleChange}
        />
      </div>

      {/* 발생 위치/페이지 */}
      <div className="postwrite-row">
        <label htmlFor="location">발생 위치/페이지</label>
        <input
          id="location"
          name="location"
          className="postwrite-title-input"
          type="text"
          placeholder="예: 게시판 목록 페이지, 로그인 화면 등"
          value={formState.location}
          onChange={handleChange}
        />
      </div>

      {/* 상세 내용 */}
      <div className="postwrite-row">
        <label htmlFor="description">상세 내용</label>
        <textarea
          id="description"
          name="description"
          className="postwrite-title-input"
          rows={6}
          placeholder="에러나 피드백에 대한 상세한 내용을 입력하세요."
          value={formState.description}
          onChange={handleChange}
          style={{ height: '120px', resize: 'vertical' }}
        />
      </div>

      {/* 에러인 경우에만 표시되는 필드들 */}
      {formState.reportType === '에러' && (
        <>
          {/* 재현 방법 */}
          <div className="postwrite-row">
            <label htmlFor="reproductionSteps">재현 방법</label>
            <textarea
              id="reproductionSteps"
              name="reproductionSteps"
              className="postwrite-title-input"
              rows={4}
              placeholder="에러를 재현하는 단계를 입력하세요. (예: 1. 로그인 2. 게시판 클릭 3. 글 작성 버튼 클릭)"
              value={formState.reproductionSteps}
              onChange={handleChange}
              style={{ height: '100px', resize: 'vertical' }}
            />
          </div>

          {/* 기대 동작 */}
          <div className="postwrite-row">
            <label htmlFor="expectedBehavior">기대 동작</label>
            <textarea
              id="expectedBehavior"
              name="expectedBehavior"
              className="postwrite-title-input"
              rows={4}
              placeholder="정상적으로 동작했을 때 예상되는 결과를 입력하세요."
              value={formState.expectedBehavior}
              onChange={handleChange}
              style={{ height: '100px', resize: 'vertical' }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default FeedbackForm;

