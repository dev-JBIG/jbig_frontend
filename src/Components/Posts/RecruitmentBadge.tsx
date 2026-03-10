import React from 'react';
import { RecruitmentInfo } from '../Utils/interfaces';

interface RecruitmentBadgeProps {
    info: RecruitmentInfo;
}

const STATUS_COLORS: Record<number, { bg: string; text: string }> = {
    1: { bg: '#dcfce7', text: '#16a34a' }, // 모집중 - green
    2: { bg: '#f3f4f6', text: '#6b7280' }, // 마감 - gray
    3: { bg: '#dbeafe', text: '#2563eb' }, // 완료 - blue
    4: { bg: '#fee2e2', text: '#dc2626' }, // 취소 - red
};

const RecruitmentBadge: React.FC<RecruitmentBadgeProps> = ({ info }) => {
    const colors = STATUS_COLORS[info.status] || STATUS_COLORS[2];
    const progress = info.max_members > 0
        ? `${info.accepted_count}/${info.max_members}명`
        : null;

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
            <span style={{
                display: 'inline-block',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: colors.bg,
                color: colors.text,
                lineHeight: '18px',
            }}>
                {info.status_display}
            </span>
            {progress && info.status === 1 && (
                <span style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    fontWeight: 500,
                }}>
                    {progress}
                </span>
            )}
        </span>
    );
};

export default RecruitmentBadge;
