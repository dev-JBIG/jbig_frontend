import React, { useEffect, useState } from "react";
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

    return (
        <div className="jbig-info-container">
            <div className="jbig-info-callout">
                <div className="jbig-info-icon">💡</div>
                <div className="jbig-info-content">
                    <p className="jbig-info-main">
                        <strong dangerouslySetInnerHTML={{ 
                            __html: settings.jbig_description
                                .replace(/'JBIG'/g, '<mark class="highlight-red">JBIG</mark>')
                                .replace(/JBNU /g, '<mark class="highlight-red">J</mark>BNU ')
                                .replace(/Big Data/g, '<mark class="highlight-red">B</mark>ig Data')
                                .replace(/AI /g, 'A<mark class="highlight-red">I</mark> ')
                                .replace(/Group/g, '<mark class="highlight-red">G</mark>roup')
                                .replace(/데이터 사이언스/g, '<mark class="highlight-orange">데이터 사이언스</mark>')
                                .replace(/딥러닝/g, '<mark class="highlight-orange">딥러닝</mark>')
                                .replace(/머신러닝/g, '<mark class="highlight-orange">머신러닝</mark>')
                                .replace(/AI에/g, '<mark class="highlight-orange">AI</mark>에')
                        }} />
                    </p>
                    <p className="jbig-info-text">
                        <strong>회장 : {settings.jbig_president} ({settings.jbig_president_dept})</strong>
                    </p>
                    <p className="jbig-info-text">
                        <strong>부회장 : {settings.jbig_vice_president} ({settings.jbig_vice_president_dept})</strong>
                    </p>
                    <p className="jbig-info-text">
                        <strong>지도 교수 : {settings.jbig_advisor} ({settings.jbig_advisor_dept})</strong>
                    </p>
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

