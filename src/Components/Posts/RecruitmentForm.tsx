import React, { useState, useEffect, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { RecruitmentFormData } from '../Utils/interfaces';
import './PostWrite.css';

interface RecruitmentFormProps {
    setContent: (content: string) => void;
    initialContent: string;
    setRecruitmentData: (data: RecruitmentFormData) => void;
    initialRecruitmentData?: RecruitmentFormData | null;
}

const RecruitmentForm: React.FC<RecruitmentFormProps> = ({
    setContent,
    initialContent,
    setRecruitmentData,
    initialRecruitmentData
}) => {
    const [recruitmentType, setRecruitmentType] = useState(initialRecruitmentData?.recruitment_type ?? 2);
    const [maxMembers, setMaxMembers] = useState(initialRecruitmentData?.max_members ?? 0);
    const [deadline, setDeadline] = useState(initialRecruitmentData?.deadline ?? '');
    const [isDeadlineTbd, setIsDeadlineTbd] = useState(!initialRecruitmentData?.deadline);
    const [requiredSkills, setRequiredSkills] = useState<string[]>(initialRecruitmentData?.required_skills ?? []);
    const [skillInput, setSkillInput] = useState('');
    const [contactInfo, setContactInfo] = useState(initialRecruitmentData?.contact_info ?? '');
    const [showApplicants, setShowApplicants] = useState(initialRecruitmentData?.show_applicants ?? false);
    const [plan, setPlan] = useState(initialContent);

    const lastGeneratedRef = useRef('');

    // 본문 생성 (MD)
    useEffect(() => {
        const generatedMarkdown = plan;
        if (lastGeneratedRef.current !== generatedMarkdown) {
            lastGeneratedRef.current = generatedMarkdown;
            setContent(generatedMarkdown);
        }
    }, [plan, setContent]);

    // recruitmentData 동기화
    useEffect(() => {
        setRecruitmentData({
            recruitment_type: recruitmentType,
            max_members: maxMembers,
            deadline: isDeadlineTbd ? '' : deadline,
            required_skills: requiredSkills,
            contact_info: contactInfo,
            show_applicants: showApplicants,
        });
    }, [recruitmentType, maxMembers, deadline, isDeadlineTbd, requiredSkills, contactInfo, showApplicants, setRecruitmentData]);

    const handleAddSkill = () => {
        const trimmed = skillInput.trim();
        if (trimmed && !requiredSkills.includes(trimmed)) {
            setRequiredSkills(prev => [...prev, trimmed]);
        }
        setSkillInput('');
    };

    const handleSkillKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSkill();
        }
    };

    const handleRemoveSkill = (skill: string) => {
        setRequiredSkills(prev => prev.filter(s => s !== skill));
    };

    return (
        <div className="study-form-container">
            <div className="absence-form-notice">
                ※ 팀원 모집 양식입니다. 모집글은 실명으로 작성됩니다.
            </div>

            <div className="postwrite-row">
                <label htmlFor="recruitmentType">모집 유형</label>
                <select
                    id="recruitmentType"
                    className="board-select"
                    value={recruitmentType}
                    onChange={e => setRecruitmentType(Number(e.target.value))}
                >
                    <option value={1}>스터디</option>
                    <option value={2}>경진대회</option>
                    <option value={3}>프로젝트</option>
                    <option value={4}>기타</option>
                </select>
            </div>

            <div className="postwrite-row">
                <label htmlFor="maxMembers">모집 인원</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <input
                        id="maxMembers"
                        className="postwrite-title-input"
                        type="number"
                        min="0"
                        value={maxMembers}
                        onChange={e => setMaxMembers(Math.max(0, Number(e.target.value)))}
                        style={{ flex: 1, maxWidth: '120px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#666' }}>
                        {maxMembers === 0 ? '(인원 제한 없음)' : `${maxMembers}명`}
                    </span>
                </div>
            </div>

            <div className="postwrite-row">
                <label htmlFor="deadline">모집 마감일</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <input
                        id="deadline"
                        className="postwrite-title-input"
                        type="date"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                        disabled={isDeadlineTbd}
                        style={{ flex: 1 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input
                            type="checkbox"
                            checked={isDeadlineTbd}
                            onChange={e => {
                                setIsDeadlineTbd(e.target.checked);
                                if (e.target.checked) setDeadline('');
                            }}
                            style={{ marginRight: '5px' }}
                        />
                        상시모집
                    </label>
                </div>
            </div>

            <div className="postwrite-row">
                <label>필요 기술/역할</label>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                            className="postwrite-title-input"
                            type="text"
                            placeholder="예: Python, 기획, PM (Enter로 추가)"
                            value={skillInput}
                            onChange={e => setSkillInput(e.target.value)}
                            onKeyDown={handleSkillKeyDown}
                            style={{ flex: 1 }}
                        />
                        <button type="button" className="write-button" onClick={handleAddSkill}
                            style={{ padding: '6px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            추가
                        </button>
                    </div>
                    {requiredSkills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {requiredSkills.map(skill => (
                                <span key={skill} className="category-badge" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    padding: '4px 10px', fontSize: '13px', cursor: 'pointer'
                                }} onClick={() => handleRemoveSkill(skill)}>
                                    {skill} &times;
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="postwrite-row">
                <label htmlFor="contactInfo">연락처</label>
                <input
                    id="contactInfo"
                    className="postwrite-title-input"
                    type="text"
                    placeholder="카카오톡 오픈채팅 링크, 이메일 등 (수락된 지원자에게만 공개)"
                    value={contactInfo}
                    onChange={e => setContactInfo(e.target.value)}
                />
            </div>

            <div className="postwrite-row">
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={showApplicants}
                        onChange={e => setShowApplicants(e.target.checked)}
                        style={{ width: 'auto', marginRight: '4px' }}
                    />
                    지원자 공개
                    <span style={{ fontSize: '0.85em', color: '#666', fontWeight: 'normal' }}>
                        (체크하면 지원자끼리 서로의 이름과 기수를 볼 수 있습니다)
                    </span>
                </label>
            </div>

            <div className="postwrite-row">
                <label style={{ fontWeight: 'bold' }}>상세 내용 (본문)</label>
                <div className="content-body">
                    <MDEditor
                        value={plan}
                        onChange={val => setPlan(val || '')}
                        data-color-mode="light"
                        height={300}
                        preview="edit"
                    />
                </div>
            </div>
        </div>
    );
};

export default RecruitmentForm;
