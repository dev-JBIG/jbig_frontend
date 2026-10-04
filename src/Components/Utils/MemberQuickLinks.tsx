import React from "react";
import "./MemberQuickLinks.css";

interface MemberQuickLinksProps {
    isLogin: boolean;
    onOpen?: () => void;
}

const MemberQuickLinks: React.FC<MemberQuickLinksProps> = ({ isLogin, onOpen }) => {
    if (!isLogin) return null;

    return (
        <div className="member-quick-links">
            <a
                className="member-quick-link member-quick-link-news"
                href="https://docs.google.com/forms/d/e/1FAIpQLSeayAi-rqN96kMX2sZb9pI_5pKvbC4XTijO5fM5RW6NeXCGew/viewform"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onOpen}
            >
                <span>좋은 소식 나누기</span>
            </a>
            <a
                className="member-quick-link member-quick-link-study"
                href="/note"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onOpen}
            >
                <span>학습 자료</span>
            </a>
        </div>
    );
};

export default MemberQuickLinks;
