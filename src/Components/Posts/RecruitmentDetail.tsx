import React, { useState, useCallback } from 'react';
import { RecruitmentDetail as RecruitmentDetailType, ApplicationItem } from '../Utils/interfaces';
import {
    applyToRecruitment, withdrawApplication, changeRecruitmentStatus,
    fetchApplications, updateApplicationStatus
} from '../../API/req';
import { useUser } from '../Utils/UserContext';
import { useAlert } from '../Utils/AlertContext';

interface RecruitmentDetailProps {
    recruitment: RecruitmentDetailType;
    postId: number;
    onUpdate: () => void;
}

const TYPE_LABELS: Record<number, string> = { 1: '스터디', 2: '경진대회', 3: '프로젝트', 4: '기타' };
const STATUS_COLORS: Record<number, string> = { 1: '#16a34a', 2: '#6b7280', 3: '#2563eb', 4: '#dc2626' };
const APP_STATUS: Record<number, { label: string; color: string }> = {
    1: { label: '대기중', color: '#f59e0b' },
    2: { label: '수락됨', color: '#16a34a' },
    3: { label: '거절됨', color: '#dc2626' },
};

const RecruitmentDetailSection: React.FC<RecruitmentDetailProps> = ({ recruitment, postId, onUpdate }) => {
    const { accessToken } = useUser();
    const { showAlert, showConfirm } = useAlert();

    const [showApplyModal, setShowApplyModal] = useState(false);
    const [applyMessage, setApplyMessage] = useState('');
    const [applying, setApplying] = useState(false);
    const [showManager, setShowManager] = useState(false);
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    const [managerTab, setManagerTab] = useState<number>(1); // PENDING
    const [loadingApps, setLoadingApps] = useState(false);

    const r = recruitment;

    const handleApply = useCallback(async () => {
        if (!accessToken) return;
        setApplying(true);
        try {
            await applyToRecruitment(postId, applyMessage, accessToken);
            setShowApplyModal(false);
            setApplyMessage('');
            showAlert({ message: '지원이 완료되었습니다!', type: 'success' });
            onUpdate();
        } catch (err: any) {
            const msg = err?.response?.data?.error || '지원에 실패했습니다.';
            showAlert({ message: msg, type: 'error' });
        } finally {
            setApplying(false);
        }
    }, [accessToken, postId, applyMessage, showAlert, onUpdate]);

    const handleWithdraw = useCallback(async () => {
        if (!accessToken) return;
        const confirmed = await showConfirm({
            message: '지원을 철회하시겠습니까?',
            title: '지원 철회',
            type: 'warning',
            confirmText: '철회',
            cancelText: '취소',
        });
        if (!confirmed) return;
        try {
            await withdrawApplication(postId, accessToken);
            showAlert({ message: '지원이 철회되었습니다.', type: 'info' });
            onUpdate();
        } catch {
            showAlert({ message: '지원 철회에 실패했습니다.', type: 'error' });
        }
    }, [accessToken, postId, showAlert, showConfirm, onUpdate]);

    const handleStatusChange = useCallback(async (action: string) => {
        if (!accessToken) return;
        const labels: Record<string, string> = {
            close: '모집을 마감하시겠습니까?',
            reopen: '모집을 재오픈하시겠습니까?',
            complete: '팀 구성을 완료 처리하시겠습니까?',
            cancel: '모집을 취소하시겠습니까? 대기중인 지원자에게 알림이 전송됩니다.',
        };
        const confirmed = await showConfirm({
            message: labels[action] || '진행하시겠습니까?',
            title: '모집 상태 변경',
            type: action === 'cancel' ? 'warning' : 'info',
        });
        if (!confirmed) return;
        try {
            await changeRecruitmentStatus(postId, action, accessToken);
            onUpdate();
        } catch (err: any) {
            showAlert({ message: err?.response?.data?.error || '상태 변경에 실패했습니다.', type: 'error' });
        }
    }, [accessToken, postId, showConfirm, showAlert, onUpdate]);

    const loadApplications = useCallback(async () => {
        if (!accessToken) return;
        setLoadingApps(true);
        try {
            const apps = await fetchApplications(postId, accessToken);
            setApplications(apps);
        } catch {
            setApplications([]);
        } finally {
            setLoadingApps(false);
        }
    }, [accessToken, postId]);

    const handleToggleManager = useCallback(() => {
        if (!showManager) loadApplications();
        setShowManager(prev => !prev);
    }, [showManager, loadApplications]);

    const handleAppAction = useCallback(async (appId: number, action: string) => {
        if (!accessToken) return;
        try {
            await updateApplicationStatus(postId, appId, action, '', accessToken);
            loadApplications();
            onUpdate();
        } catch (err: any) {
            showAlert({ message: err?.response?.data?.error || '처리에 실패했습니다.', type: 'error' });
        }
    }, [accessToken, postId, loadApplications, onUpdate, showAlert]);

    const filteredApps = applications.filter(a => a.status === managerTab);

    const deadlineStr = r.deadline
        ? new Date(r.deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
        : '상시모집';

    const isExpired = r.deadline ? new Date(r.deadline) < new Date() : false;

    return (
        <div style={{
            border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px',
            marginBottom: '24px', backgroundColor: '#f8fafc'
        }}>
            {/* 모집 정보 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                    backgroundColor: '#dbeafe', color: '#2563eb'
                }}>
                    {TYPE_LABELS[r.recruitment_type] || '기타'}
                </span>
                <span style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                    backgroundColor: r.status === 1 ? '#dcfce7' : '#f3f4f6',
                    color: STATUS_COLORS[r.status] || '#6b7280'
                }}>
                    {r.status_display}
                </span>
            </div>

            {/* 모집 정보 테이블 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: '14px', marginBottom: '16px' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>모집 인원</span>
                <span>{r.max_members === 0 ? '제한 없음' : `${r.accepted_count} / ${r.max_members}명`}</span>

                <span style={{ color: '#64748b', fontWeight: 500 }}>마감일</span>
                <span style={{ color: isExpired ? '#dc2626' : undefined }}>
                    {deadlineStr} {isExpired && '(마감됨)'}
                </span>

                {r.required_skills.length > 0 && (
                    <>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>필요 기술</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {r.required_skills.map(skill => (
                                <span key={skill} style={{
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                    backgroundColor: '#e2e8f0', color: '#475569'
                                }}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </>
                )}

                {r.contact_info && (
                    <>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>연락처</span>
                        <span>{r.contact_info}</span>
                    </>
                )}
            </div>

            {/* 지원 상태 / 버튼 영역 */}
            {accessToken && !r.is_owner && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    {r.has_applied && r.my_application_status !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '14px' }}>
                                지원 상태:
                                <span style={{
                                    marginLeft: '6px', fontWeight: 600,
                                    color: APP_STATUS[r.my_application_status]?.color || '#6b7280'
                                }}>
                                    {APP_STATUS[r.my_application_status]?.label || '알 수 없음'}
                                </span>
                            </span>
                            {r.my_application_status === 1 && (
                                <button onClick={handleWithdraw} style={{
                                    padding: '6px 14px', fontSize: '13px', borderRadius: '6px',
                                    border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', color: '#dc2626'
                                }}>
                                    지원 철회
                                </button>
                            )}
                        </div>
                    ) : (
                        r.status === 1 && (
                            <button onClick={() => setShowApplyModal(true)} style={{
                                padding: '10px 24px', fontSize: '14px', fontWeight: 600, borderRadius: '8px',
                                border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer'
                            }}>
                                지원하기
                            </button>
                        )
                    )}
                </div>
            )}

            {/* 모집자 관리 영역 */}
            {r.is_owner && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {r.status === 1 && (
                            <button onClick={() => handleStatusChange('close')} className="write-button"
                                style={{ fontSize: '13px', padding: '6px 14px' }}>모집 마감</button>
                        )}
                        {r.status === 2 && (
                            <>
                                <button onClick={() => handleStatusChange('reopen')} className="write-button"
                                    style={{ fontSize: '13px', padding: '6px 14px' }}>재오픈</button>
                                <button onClick={() => handleStatusChange('complete')} className="write-button"
                                    style={{ fontSize: '13px', padding: '6px 14px' }}>팀 구성 완료</button>
                            </>
                        )}
                        {(r.status === 1 || r.status === 2) && (
                            <button onClick={() => handleStatusChange('cancel')}
                                style={{
                                    fontSize: '13px', padding: '6px 14px', borderRadius: '6px',
                                    border: '1px solid #fca5a5', backgroundColor: '#fff', color: '#dc2626', cursor: 'pointer'
                                }}>모집 취소</button>
                        )}
                    </div>

                    <button onClick={handleToggleManager} style={{
                        padding: '8px 16px', fontSize: '13px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer',
                    }}>
                        {showManager ? '지원자 관리 닫기' : `지원자 관리${r.total_applicants != null ? ` (${r.total_applicants}명)` : ''}`}
                    </button>

                    {/* 지원자 관리 패널 */}
                    {showManager && (
                        <div style={{ marginTop: '16px' }}>
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                                {[
                                    { val: 1, label: '대기중' },
                                    { val: 2, label: '수락됨' },
                                    { val: 3, label: '거절됨' }
                                ].map(tab => (
                                    <button key={tab.val} onClick={() => setManagerTab(tab.val)} style={{
                                        padding: '6px 14px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer',
                                        border: managerTab === tab.val ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                        backgroundColor: managerTab === tab.val ? '#eff6ff' : '#fff',
                                        color: managerTab === tab.val ? '#2563eb' : '#475569',
                                        fontWeight: managerTab === tab.val ? 600 : 400,
                                    }}>
                                        {tab.label} ({applications.filter(a => a.status === tab.val).length})
                                    </button>
                                ))}
                            </div>

                            {loadingApps ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
                            ) : filteredApps.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                                    해당 상태의 지원자가 없습니다.
                                </div>
                            ) : (
                                filteredApps.map(app => (
                                    <div key={app.id} style={{
                                        border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px',
                                        marginBottom: '8px', backgroundColor: '#fff'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '14px' }}>
                                                {app.applicant_semester ? `${app.applicant_semester}기 ` : ''}{app.applicant_name}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                {new Date(app.created_at).toLocaleDateString('ko-KR')}
                                            </span>
                                        </div>
                                        {app.message && (
                                            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                                                {app.message}
                                            </div>
                                        )}
                                        {app.applicant_resume && (
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                                                자기소개: {app.applicant_resume}
                                            </div>
                                        )}
                                        {managerTab === 1 && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => handleAppAction(app.id, 'accept')} style={{
                                                    padding: '5px 12px', fontSize: '12px', borderRadius: '6px',
                                                    border: 'none', backgroundColor: '#16a34a', color: '#fff', cursor: 'pointer'
                                                }}>수락</button>
                                                <button onClick={() => handleAppAction(app.id, 'reject')} style={{
                                                    padding: '5px 12px', fontSize: '12px', borderRadius: '6px',
                                                    border: '1px solid #fca5a5', backgroundColor: '#fff', color: '#dc2626', cursor: 'pointer'
                                                }}>거절</button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 지원 모달 */}
            {showApplyModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000,
                }} onClick={() => setShowApplyModal(false)}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
                        width: '90%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>지원하기</h3>
                        <textarea
                            placeholder="자기소개나 지원 동기를 작성해주세요 (선택사항)"
                            value={applyMessage}
                            onChange={e => setApplyMessage(e.target.value)}
                            rows={5}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                fontSize: '14px', resize: 'vertical', boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <button onClick={() => setShowApplyModal(false)} style={{
                                padding: '8px 20px', fontSize: '14px', borderRadius: '8px',
                                border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer'
                            }}>취소</button>
                            <button onClick={handleApply} disabled={applying} style={{
                                padding: '8px 20px', fontSize: '14px', fontWeight: 600, borderRadius: '8px',
                                border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer',
                                opacity: applying ? 0.6 : 1
                            }}>
                                {applying ? '지원 중...' : '지원하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecruitmentDetailSection;
