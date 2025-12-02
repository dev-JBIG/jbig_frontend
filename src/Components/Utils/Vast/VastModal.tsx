import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './VastModal.css';
import { vastCreateInstance, vastDeleteInstance, vastExtendInstance, vastGetInstance, vastListOffers, VastOfferFilter } from '../../../API/vast';
import { useUser } from '../UserContext';

interface VastModalProps {
    onClose: () => void;
}

type Step = 'config' | 'provision' | 'running' | 'error';

const defaultImage = 'pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime';
const PROVISION_TIMEOUT_MS = 5 * 60 * 1000; // 5분

const VastModal: React.FC<VastModalProps> = ({ onClose }) => {
    const { accessToken } = useUser();
    const [step, setStep] = useState<Step>('config');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const [maxPrice, setMaxPrice] = useState<number>(1.0);
    const [offers, setOffers] = useState<any[]>([]);
    const [selectedOffer, setSelectedOffer] = useState<any | null>(null);

    const [instanceId, setInstanceId] = useState<string | number | null>(null);
    const [jupyterUrl, setJupyterUrl] = useState<string>('');

    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [now, setNow] = useState<number>(Date.now());

    // 프로비저닝 취소용
    const [provisionStartTime, setProvisionStartTime] = useState<number | null>(null);
    const cancelledRef = useRef(false);

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const openHandler = () => {
            resetToConfig();
        };
        window.addEventListener('OPEN_VAST_MODAL', openHandler);
        return () => window.removeEventListener('OPEN_VAST_MODAL', openHandler);
    }, []);

    const remainingSeconds = useMemo(() => {
        if (!expiresAt) return 0;
        return Math.max(0, Math.floor((expiresAt - now) / 1000));
    }, [expiresAt, now]);

    const provisionElapsedSeconds = useMemo(() => {
        if (!provisionStartTime) return 0;
        return Math.floor((now - provisionStartTime) / 1000);
    }, [provisionStartTime, now]);

    const resetToConfig = useCallback(() => {
        setStep('config');
        setError('');
        setSelectedOffer(null);
        setInstanceId(null);
        setJupyterUrl('');
        setExpiresAt(null);
        setProvisionStartTime(null);
        cancelledRef.current = false;
    }, []);

    const handleSearchOffers = async () => {
        if (!accessToken) {
            setError('로그인이 필요합니다.');
            return;
        }
        try {
            setLoading(true);
            setError('');
            const filter: VastOfferFilter = {
                max_hourly_price: maxPrice,
            };
            const list = await vastListOffers(filter, accessToken);
            setOffers(list);
            if (list.length === 0) setError('조건에 맞는 오퍼가 없습니다. 필터를 완화해보세요.');
        } catch (e: any) {
            setError(e?.response?.data?.detail || e?.message || '오퍼 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelProvision = async () => {
        cancelledRef.current = true;
        if (instanceId && accessToken) {
            try {
                await vastDeleteInstance(instanceId, accessToken);
            } catch (e) {
                // 삭제 실패해도 무시
            }
        }
        resetToConfig();
        setError('인스턴스 생성이 취소되었습니다. 다른 오퍼를 선택해주세요.');
    };

    const handleProvision = async () => {
        if (!accessToken) {
            setError('로그인이 필요합니다.');
            return;
        }
        if (!selectedOffer) {
            alert('오퍼를 먼저 선택하세요.');
            return;
        }

        cancelledRef.current = false;
        const startTime = Date.now();
        setProvisionStartTime(startTime);

        try {
            setLoading(true);
            setError('');
            setStep('provision');

            const created = await vastCreateInstance({
                offer_id: selectedOffer.id,
                image: defaultImage,
                disk_gb: 20,
                gpu_name: selectedOffer.gpu_name,
                hourly_price: selectedOffer.hourly_price,
            }, accessToken);

            if (cancelledRef.current) return;

            setInstanceId(created.id);

            if (created.expires_at) {
                setExpiresAt(new Date(created.expires_at).getTime());
            }

            // 5분 타임아웃 체크하면서 폴링
            for (let i = 0; i < 60; i++) {
                if (cancelledRef.current) return;

                // 5분 초과 시 자동 취소
                if (Date.now() - startTime > PROVISION_TIMEOUT_MS) {
                    if (created.id && accessToken) {
                        try {
                            await vastDeleteInstance(created.id, accessToken);
                        } catch (e) {
                            // 삭제 실패해도 무시
                        }
                    }
                    resetToConfig();
                    setError('5분 내에 인스턴스가 시작되지 않아 취소되었습니다. 다른 오퍼를 선택해주세요.');
                    return;
                }

                await new Promise(r => setTimeout(r, 5000));

                if (cancelledRef.current) return;

                try {
                    const info = await vastGetInstance(created.id, accessToken);
                    if (info.status === "running") {
                        setJupyterUrl(info.jupyter_url || '');
                        if (info.expires_at) {
                            setExpiresAt(new Date(info.expires_at).getTime());
                        }
                        setStep('running');
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    // 조회 실패 시 계속 재시도
                }
            }

            // 60회 폴링 후에도 실패
            if (created.id && accessToken) {
                try {
                    await vastDeleteInstance(created.id, accessToken);
                } catch (e) {}
            }
            resetToConfig();
            setError('인스턴스가 시작되지 않았습니다. 다른 오퍼를 선택해주세요.');

        } catch (e: any) {
            if (cancelledRef.current) return;
            setStep('error');
            setError(e?.response?.data?.detail || e?.message || '인스턴스 생성 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleExtend = async () => {
        if (!instanceId || !accessToken) return;
        try {
            setLoading(true);
            setError('');
            const result = await vastExtendInstance(instanceId, accessToken);
            if (result.expires_at) {
                setExpiresAt(new Date(result.expires_at).getTime());
            }
        } catch (e: any) {
            setError(e?.response?.data?.detail || e?.message || '연장 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleTerminate = async () => {
        if (!instanceId || !accessToken) { onClose(); return; }
        try {
            setLoading(true);
            await vastDeleteInstance(instanceId, accessToken);
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.detail || e?.message || '인스턴스 종료 실패');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (expiresAt && remainingSeconds === 0 && step === 'running') {
            handleTerminate();
        }
    }, [remainingSeconds, expiresAt, step]);

    return ReactDOM.createPortal(
        <div className="vast-modal-backdrop">
            <div className="vast-modal" onClick={(e) => e.stopPropagation()}>
                <h2>GPU 인스턴스 대여</h2>

                {step === 'config' && (
                    <>
                        <div className="form-group">
                            <label>최대 시간당 가격 (USD)</label>
                            <input type="number" step="0.1" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} />
                        </div>

                        <div className="actions">
                            <button className="btn-secondary" onClick={onClose}>닫기</button>
                            <button className="btn-primary" onClick={handleSearchOffers} disabled={loading}>
                                {loading ? '검색 중...' : '오퍼 검색'}
                            </button>
                        </div>

                        {error && <div className="error">{error}</div>}

                        {offers.length > 0 && (
                            <div className="offer-table">
                                <div className="offer-header">
                                    <div>ID</div>
                                    <div>GPU</div>
                                    <div>VRAM</div>
                                    <div>$/h</div>
                                    <div>Reliab.</div>
                                    <div>선택</div>
                                </div>
                                {offers.map(o => (
                                    <div className={`offer-row ${selectedOffer?.id===o.id? 'selected':''}`} key={o.id}>
                                        <div>{o.id}</div>
                                        <div>{o.gpu_name}</div>
                                        <div>{o.vram_gb} GB</div>
                                        <div>${o.hourly_price.toFixed(3)}</div>
                                        <div>{o.reliability?.toFixed?.(2) ?? '-'}</div>
                                        <div>
                                            <button className="btn-small" onClick={() => setSelectedOffer(o)}>선택</button>
                                        </div>
                                    </div>
                                ))}
                                <div className="actions">
                                    <button className="btn-primary" onClick={handleProvision} disabled={!selectedOffer || loading}>
                                        인스턴스 생성
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {step === 'provision' && (
                    <div className="center">
                        <p>인스턴스 생성 중입니다...</p>
                        <p className="provision-timer">
                            경과 시간: {Math.floor(provisionElapsedSeconds / 60)}분 {provisionElapsedSeconds % 60}초
                            {' '}/ 5분
                        </p>
                        <p className="provision-hint">5분 내에 시작되지 않으면 자동 취소됩니다.</p>
                        <div className="actions">
                            <button className="btn-danger" onClick={handleCancelProvision}>
                                취소하고 다른 오퍼 선택
                            </button>
                        </div>
                    </div>
                )}

                {step === 'running' && (
                    <div>
                        <div className="info">
                            <div>Instance ID: {instanceId}</div>
                            <div>
                                Jupyter: {jupyterUrl ? (<a href={jupyterUrl} target="_blank" rel="noreferrer">열기</a>) : '준비 중...'}
                            </div>
                            <div>남은 시간: {Math.floor(remainingSeconds/60)}분 {remainingSeconds%60}초</div>
                        </div>
                        <div className="actions">
                            <button className="btn-secondary" onClick={handleExtend} disabled={loading}>
                                {loading ? '처리 중...' : '30분 연장'}
                            </button>
                            <button className="btn-danger" onClick={handleTerminate} disabled={loading}>
                                {loading ? '종료 중...' : '종료'}
                            </button>
                        </div>
                        {error && <div className="error">{error}</div>}
                    </div>
                )}

                {step === 'error' && (
                    <div>
                        <div className="error">{error}</div>
                        <div className="actions">
                            <button className="btn-secondary" onClick={resetToConfig}>다시 시도</button>
                            <button className="btn-secondary" onClick={onClose}>닫기</button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default VastModal;
