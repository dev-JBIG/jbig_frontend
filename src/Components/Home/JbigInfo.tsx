import React, { ReactNode, useEffect, useMemo, useState } from "react";
import "./JbigInfo.css";
import { fetchSiteSettings, SiteSettings } from "../../API/req";

interface JbigInfoProps {
    calendarSlot?: ReactNode;
}

const JbigInfo: React.FC<JbigInfoProps> = ({ calendarSlot }) => {
    // 하드코딩 제거
    const [settings, setSettings] = useState<SiteSettings>({
        notion_page_id: '',
        quiz_url: '',
        jbig_description: '',
        jbig_president: '',
        jbig_president_dept: '',
        jbig_vice_president: '',
        jbig_vice_president_dept: '',
        jbig_email: '',
        jbig_advisor: '',
        jbig_advisor_dept: ''
    });

    // 2. 로딩 상태 추가
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await fetchSiteSettings();
                setSettings(data);
            } catch (error) {
                console.error('Failed to load site settings:', error);
            } finally {
                // 3. 데이터 로딩이 끝나면(성공하든 실패하든) 로딩 상태 해제
                setLoading(false);
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

    // 4. 로딩 중일 때는 화면에 아무것도 보여주지 않거나 로딩 표시
    if (loading) {
        return <div className="jbig-info-container" style={{ minHeight: '400px' }}></div>; 
    }

    return (
        <div className="jbig-info-container">
            <section className="jbig-cover" aria-label="JBIG 대문">
                <div className="jbig-cover-grid" aria-hidden="true" />
                <div className="jbig-cover-panel" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </div>
                <div className="jbig-cover-node node-a" aria-hidden="true" />
                <div className="jbig-cover-node node-b" aria-hidden="true" />
                <div className="jbig-cover-node node-c" aria-hidden="true" />
                <div className="jbig-cover-line line-a" aria-hidden="true" />
                <div className="jbig-cover-line line-b" aria-hidden="true" />
                <div className="jbig-cover-line line-c" aria-hidden="true" />

                <div className="jbig-cover-main">
                    <div className="jbig-cover-header">
                        <div>
                            <div className="jbig-cover-kicker">JBNU Big Data & AI Group</div>
                            <h2 className="jbig-cover-title">JBIG</h2>
                        </div>
                    </div>

                    <p className="jbig-cover-description">
                        {highlightedDescription}
                    </p>

                    <div className="jbig-cover-content-grid">
                        <div className="jbig-cover-info-stack">
                            <div className="jbig-cover-section">
                                <h3><span>JBIG</span>가 무슨 약자인가요?</h3>
                                <div className="jbig-cover-acronym" role="list">
                                    <div role="listitem"><strong>J</strong><span>JBNU</span></div>
                                    <div role="listitem"><strong>B</strong><span>Big Data</span></div>
                                    <div role="listitem"><strong>I</strong><span>AI</span></div>
                                    <div role="listitem"><strong>G</strong><span>Group</span></div>
                                </div>
                            </div>

                            <div className="jbig-cover-section">
                                <h3>우리가 하는 활동</h3>
                                <div className="jbig-cover-activities" role="list">
                                    <span role="listitem">데이터 사이언스</span>
                                    <span role="listitem">딥러닝</span>
                                    <span role="listitem">머신러닝</span>
                                    <span role="listitem">AI</span>
                                </div>
                            </div>

                            <div className="jbig-cover-leaders">
                                <div className="jbig-cover-leader jbig-cover-leader-advisor">
                                    <span>지도 교수</span>
                                    <strong>{settings.jbig_advisor}</strong>
                                    <em>{settings.jbig_advisor_dept}</em>
                                </div>
                                <div className="jbig-cover-leader">
                                    <span>회장</span>
                                    <strong>{settings.jbig_president}</strong>
                                    <em>{settings.jbig_president_dept}</em>
                                </div>
                                <div className="jbig-cover-leader">
                                    <span>부회장</span>
                                    <strong>{settings.jbig_vice_president}</strong>
                                    <em>{settings.jbig_vice_president_dept}</em>
                                </div>
                            </div>

                            <div className="jbig-cover-contact">
                                <span>Contact</span>
                                <strong>회장 {settings.jbig_president}</strong>
                                <em>{settings.jbig_email}</em>
                            </div>
                        </div>

                        {calendarSlot && (
                            <div className="jbig-cover-calendar">
                                <div className="jbig-cover-calendar-title">Calendar</div>
                                {calendarSlot}
                            </div>
                        )}
                    </div>

                </div>
            </section>
        </div>
    );
};

export default JbigInfo;
