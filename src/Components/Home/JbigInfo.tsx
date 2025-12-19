/* eslint-disable unicorn/prefer-string-replace-all */
import React, { useEffect, useMemo, useState } from "react";
import "./JbigInfo.css";
import { fetchSiteSettings, SiteSettings } from "../../API/req";

const JbigInfo: React.FC = () => {
    const [settings, setSettings] = useState<SiteSettings>({
        notion_page_id: '',
        quiz_url: '',
        jbig_description: "'JBIG'(JBNU Big Data & AI Group)은 데이터 사이언스와 딥러닝, 머신러닝을 포함한 AI에 대한 학술 교류를 목표로 2021년 설립된 전북대학교의 학생 학회입니다.",
        jbig_president: '박성현',
        jbig_president_dept: '전자공학부',
        jbig_vice_president: '국환',
        jbig_vice_president_dept: '사회학과',
        jbig_email: 'green031234@naver.com',
        jbig_advisor: '최규빈 교수님',
        jbig_advisor_dept: '통계학과'
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await fetchSiteSettings();
                setSettings(data);
            } catch (error) {
                console.error('Failed to load site settings:', error);
            }
        };
        loadSettings();
    }, []);

    const highlightedDescription = useMemo(() => {
        const text = settings.jbig_description || "";
        const tokenRegex =
            /(JBIG|JBNU|Big Data|AI|Group|데이터 사이언스|딥러닝|머신러닝)/g;

        return text.split(tokenRegex).filter(Boolean).map((part, idx) => {
            const className =
                part === "JBIG"
                    ? "jbig-highlight-brand"
                    : part === "JBNU" || part === "Big Data" || part === "AI" || part === "Group"
                        ? "jbig-highlight-acronym"
                        : part === "데이터 사이언스" || part === "딥러닝" || part === "머신러닝"
                            ? "jbig-highlight-topic"
                            : undefined;

            if (!className) return <React.Fragment key={idx}>{part}</React.Fragment>;
            return (
                <span key={idx} className={className}>
                    {part}
                </span>
            );
        });
    }, [settings.jbig_description]);

    return (
        <div className="jbig-info-container">
            <div className="jbig-info-hero">
                <div className="jbig-info-badge" aria-hidden="true">
                    JBIG
                </div>
                <div className="jbig-info-hero-text">
                    <div className="jbig-info-kicker">JBNU Big Data & AI Group</div>
                    <div className="jbig-info-title">
                        <span className="jbig-info-title-strong">JBIG</span>는 데이터·AI 학술 교류 모임입니다
                    </div>
                </div>
                <div className="jbig-info-hero-icon" aria-hidden="true">
                    💡
                </div>
            </div>

            <div className="jbig-info-body">
                <p className="jbig-info-main">{highlightedDescription}</p>

                <div className="jbig-acronym-section">
                    <div className="jbig-section-title">
                        <span className="jbig-section-title-strong">JBIG</span>가 무슨 약자인가요?
                    </div>
                    <div className="jbig-acronym-chips" role="list">
                        <div className="jbig-acronym-chip" role="listitem">
                            <span className="jbig-acronym-letter">J</span>
                            <span className="jbig-acronym-word">JBNU</span>
                        </div>
                        <div className="jbig-acronym-chip" role="listitem">
                            <span className="jbig-acronym-letter">B</span>
                            <span className="jbig-acronym-word">Big Data</span>
                        </div>
                        <div className="jbig-acronym-chip" role="listitem">
                            <span className="jbig-acronym-letter">I</span>
                            <span className="jbig-acronym-word">AI</span>
                        </div>
                        <div className="jbig-acronym-chip" role="listitem">
                            <span className="jbig-acronym-letter">G</span>
                            <span className="jbig-acronym-word">Group</span>
                        </div>
                    </div>
                </div>

                <div className="jbig-activities-section">
                    <div className="jbig-section-title">우리가 하는 활동</div>
                    <div className="jbig-activity-chips" role="list">
                        <div className="jbig-activity-chip" role="listitem">
                            <span className="jbig-activity-dot" aria-hidden="true" />
                            데이터 사이언스
                        </div>
                        <div className="jbig-activity-chip" role="listitem">
                            <span className="jbig-activity-dot" aria-hidden="true" />
                            딥러닝
                        </div>
                        <div className="jbig-activity-chip" role="listitem">
                            <span className="jbig-activity-dot" aria-hidden="true" />
                            머신러닝
                        </div>
                        <div className="jbig-activity-chip" role="listitem">
                            <span className="jbig-activity-dot" aria-hidden="true" />
                            AI
                        </div>
                    </div>
                </div>

                <div className="jbig-leaders">
                    <div className="jbig-leader-line">
                        <span className="jbig-leader-label">회장</span>
                        <span className="jbig-leader-value">
                            {settings.jbig_president} <span className="jbig-leader-meta">({settings.jbig_president_dept})</span>
                        </span>
                    </div>
                    <div className="jbig-leader-line">
                        <span className="jbig-leader-label">부회장</span>
                        <span className="jbig-leader-value">
                            {settings.jbig_vice_president} <span className="jbig-leader-meta">({settings.jbig_vice_president_dept})</span>
                        </span>
                    </div>
                    <div className="jbig-leader-line">
                        <span className="jbig-leader-label">지도 교수</span>
                        <span className="jbig-leader-value">
                            {settings.jbig_advisor} <span className="jbig-leader-meta">({settings.jbig_advisor_dept})</span>
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="jbig-contact-section">
                <h3 className="jbig-contact-title">📞 <strong>Contact</strong></h3>
                <hr className="jbig-divider" />
                <p className="jbig-contact-text">👑 <strong>회장 {settings.jbig_president}</strong></p>
                <p className="jbig-contact-text">📧 e-mail : {settings.jbig_email}</p>
                <p className="jbig-contact-quote">"이메일로 연락 주시면 빠른 시일 내에 연락드리겠습니다!"</p>
            </div>
        </div>
    );
};

export default JbigInfo;

