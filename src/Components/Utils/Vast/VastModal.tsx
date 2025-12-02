import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import './VastModal.css';
import { vastCreateInstance, vastDeleteInstance, vastGetInstance, vastListOffers, VastOfferFilter } from '../../../API/vast';
import { useUser } from '../UserContext';

interface VastModalProps {
    onClose: () => void;
}

type Step = 'config' | 'provision' | 'running' | 'error';

const defaultImage = 'pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime';

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

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const openHandler = () => {
            setStep('config');
            setError('');
            setSelectedOffer(null);
            setOffers([]);
        };
        window.addEventListener('OPEN_VAST_MODAL', openHandler);
        return () => window.removeEventListener('OPEN_VAST_MODAL', openHandler);
    }, []);

    const remainingSeconds = useMemo(() => {
        if (!expiresAt) return 0;
        return Math.max(0, Math.floor((expiresAt - now) / 1000));
    }, [expiresAt, now]);

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

    const handleProvision = async () => {
        if (!accessToken) {
            setError('로그인이 필요합니다.');
            return;
        }
        if (!selectedOffer) {
            alert('오퍼를 먼저 선택하세요.');
            return;
        }
        try {
            setLoading(true);
            setError('');
            setStep('provision');
            const created = await vastCreateInstance({
                offer_id: selectedOffer.id,
                image: defaultImage,
                disk_gb: 20,
            }, accessToken);
            setInstanceId(created.id);

            for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 5000));
                const info = await vastGetInstance(created.id, accessToken);
                if (info.status === "running" && info.jupyter_url) {
                    setJupyterUrl(info.jupyter_url);
                    setStep('running');
                    setExpiresAt(Date.now() + 30 * 60 * 1000);
                    return;
                }
            }
            throw new Error('인스턴스가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
        } catch (e: any) {
            setStep('error');
            setError(e?.response?.data?.detail || e?.message || '인스턴스 생성 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleExtend = () => {
        setExpiresAt(Date.now() + 30 * 60 * 1000);
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
        if (expiresAt && remainingSeconds === 0) {
            handleTerminate();
        }
    }, [remainingSeconds, expiresAt]);

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
                            <button className="btn-primary" onClick={handleSearchOffers} disabled={loading}>오퍼 검색</button>
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
                                    <button className="btn-primary" onClick={handleProvision} disabled={!selectedOffer || loading}>인스턴스 생성</button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {step === 'provision' && (
                    <div className="center">
                        <p>인스턴스 생성 중입니다... 몇 분 정도 소요될 수 있습니다.</p>
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
                            <button className="btn-secondary" onClick={handleExtend}>30분 연장</button>
                            <button className="btn-danger" onClick={handleTerminate} disabled={loading}>종료</button>
                        </div>
                        {error && <div className="error">{error}</div>}
                    </div>
                )}

                {step === 'error' && <div className="error">{error}</div>}
            </div>
        </div>,
        document.body
    );
};

export default VastModal;


