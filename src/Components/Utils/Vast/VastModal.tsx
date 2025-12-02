import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './VastModal.css';
import { vastCreateInstance, vastDeleteInstance, vastExtendInstance, vastGetInstance, vastListOffers, VastOffer } from '../../../API/vast';
import { useUser } from '../UserContext';

type Step = 'config' | 'provision' | 'running' | 'error';
const DEFAULT_IMAGE = 'pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime';
const PROVISION_TIMEOUT = 5 * 60 * 1000; // 5분

const VastModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { accessToken } = useUser();
    const [step, setStep] = useState<Step>('config');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [maxPrice, setMaxPrice] = useState(1.0);
    const [offers, setOffers] = useState<VastOffer[]>([]);
    const [selected, setSelected] = useState<VastOffer | null>(null);
    const [instanceId, setInstanceId] = useState<string | number | null>(null);
    const [jupyterUrl, setJupyterUrl] = useState('');
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [now, setNow] = useState(Date.now());
    const [provisionStart, setProvisionStart] = useState<number | null>(null);
    const cancelRef = useRef(false);

    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

    const remaining = useMemo(() => expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0, [expiresAt, now]);
    const elapsed = useMemo(() => provisionStart ? Math.floor((now - provisionStart) / 1000) : 0, [provisionStart, now]);

    const reset = useCallback(() => {
        setStep('config'); setError(''); setSelected(null); setInstanceId(null);
        setJupyterUrl(''); setExpiresAt(null); setProvisionStart(null); cancelRef.current = false;
    }, []);

    useEffect(() => { window.addEventListener('OPEN_VAST_MODAL', reset); return () => window.removeEventListener('OPEN_VAST_MODAL', reset); }, [reset]);
    useEffect(() => { if (expiresAt && remaining === 0 && step === 'running') handleTerminate(); }, [remaining, expiresAt, step]);

    const handleSearch = async () => {
        if (!accessToken) return setError('로그인 필요');
        setLoading(true); setError('');
        try {
            const list = await vastListOffers({ max_hourly_price: maxPrice }, accessToken);
            setOffers(list);
            if (!list.length) setError('조건에 맞는 오퍼 없음');
        } catch (e: any) { setError(e?.response?.data?.detail || '오퍼 조회 실패'); }
        finally { setLoading(false); }
    };

    const handleCancel = async () => {
        cancelRef.current = true;
        if (instanceId && accessToken) try { await vastDeleteInstance(instanceId, accessToken); } catch {}
        reset(); setError('취소됨. 다른 오퍼 선택하세요.');
    };

    const handleProvision = async () => {
        if (!accessToken || !selected) return;
        cancelRef.current = false;
        const start = Date.now();
        setProvisionStart(start); setLoading(true); setError(''); setStep('provision');

        try {
            const created = await vastCreateInstance({ offer_id: selected.id, image: DEFAULT_IMAGE, disk_gb: 20, gpu_name: selected.gpu_name, hourly_price: selected.hourly_price }, accessToken);
            if (cancelRef.current) return;
            setInstanceId(created.id);
            setExpiresAt(created.expires_at ? new Date(created.expires_at).getTime() : Date.now() + 30 * 60 * 1000);

            // 5분 타임아웃 폴링
            for (let i = 0; i < 60; i++) {
                if (cancelRef.current) return;
                if (Date.now() - start > PROVISION_TIMEOUT) {
                    try { await vastDeleteInstance(created.id, accessToken); } catch {}
                    reset(); setError('5분 타임아웃. 다른 오퍼 선택하세요.'); return;
                }
                await new Promise(r => setTimeout(r, 5000));
                if (cancelRef.current) return;
                try {
                    const info = await vastGetInstance(created.id, accessToken);
                    if (info.status === 'running') {
                        setJupyterUrl(info.jupyter_url || '');
                        if (info.expires_at) setExpiresAt(new Date(info.expires_at).getTime());
                        setStep('running'); setLoading(false); return;
                    }
                } catch {}
            }
            try { await vastDeleteInstance(created.id, accessToken); } catch {}
            reset(); setError('인스턴스 시작 실패');
        } catch (e: any) {
            if (!cancelRef.current) { setStep('error'); setError(e?.response?.data?.detail || '생성 실패'); }
        } finally { setLoading(false); }
    };

    const handleExtend = async () => {
        if (!instanceId || !accessToken) return;
        setLoading(true); setError('');
        try {
            const r = await vastExtendInstance(instanceId, accessToken);
            if (r.expires_at) setExpiresAt(new Date(r.expires_at).getTime());
        } catch (e: any) { setError(e?.response?.data?.detail || '연장 실패'); }
        finally { setLoading(false); }
    };

    const handleTerminate = async () => {
        if (!instanceId || !accessToken) { onClose(); return; }
        setLoading(true);
        try { await vastDeleteInstance(instanceId, accessToken); onClose(); }
        catch (e: any) { setError(e?.response?.data?.detail || '종료 실패'); }
        finally { setLoading(false); }
    };

    return ReactDOM.createPortal(
        <div className="vast-modal-backdrop">
            <div className="vast-modal" onClick={e => e.stopPropagation()}>
                <h2>GPU 인스턴스 대여</h2>

                {step === 'config' && <>
                    <div className="form-group">
                        <label>최대 시간당 가격 (USD)</label>
                        <input type="number" step="0.1" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} />
                    </div>
                    <div className="actions">
                        <button className="btn-secondary" onClick={onClose}>닫기</button>
                        <button className="btn-primary" onClick={handleSearch} disabled={loading}>{loading ? '검색 중...' : '오퍼 검색'}</button>
                    </div>
                    {error && <div className="error">{error}</div>}
                    {offers.length > 0 && <div className="offer-table">
                        <div className="offer-header"><div>ID</div><div>GPU</div><div>VRAM</div><div>$/h</div><div>Reliab.</div><div>선택</div></div>
                        {offers.map(o => (
                            <div className={`offer-row ${selected?.id === o.id ? 'selected' : ''}`} key={o.id}>
                                <div>{o.id}</div><div>{o.gpu_name}</div><div>{o.vram_gb} GB</div>
                                <div>${o.hourly_price.toFixed(3)}</div><div>{o.reliability?.toFixed(2) ?? '-'}</div>
                                <div><button className="btn-small" onClick={() => setSelected(o)}>선택</button></div>
                            </div>
                        ))}
                        <div className="actions">
                            <button className="btn-primary" onClick={handleProvision} disabled={!selected || loading}>인스턴스 생성</button>
                        </div>
                    </div>}
                </>}

                {step === 'provision' && <div className="center">
                    <p>인스턴스 생성 중...</p>
                    <p className="provision-timer">{Math.floor(elapsed / 60)}분 {elapsed % 60}초 / 5분</p>
                    <p className="provision-hint">5분 내 시작 안되면 자동 취소</p>
                    <div className="actions"><button className="btn-danger" onClick={handleCancel}>취소</button></div>
                </div>}

                {step === 'running' && <div>
                    <div className="info">
                        <div>ID: {instanceId}</div>
                        <div>Jupyter: {jupyterUrl ? <a href={jupyterUrl} target="_blank" rel="noreferrer">열기</a> : '준비 중...'}</div>
                        <div>남은 시간: {Math.floor(remaining / 60)}분 {remaining % 60}초</div>
                    </div>
                    <div className="actions">
                        <button className="btn-secondary" onClick={handleExtend} disabled={loading}>{loading ? '처리 중...' : '30분 연장'}</button>
                        <button className="btn-danger" onClick={handleTerminate} disabled={loading}>{loading ? '종료 중...' : '종료'}</button>
                    </div>
                    {error && <div className="error">{error}</div>}
                </div>}

                {step === 'error' && <div>
                    <div className="error">{error}</div>
                    <div className="actions">
                        <button className="btn-secondary" onClick={reset}>다시 시도</button>
                        <button className="btn-secondary" onClick={onClose}>닫기</button>
                    </div>
                </div>}
            </div>
        </div>,
        document.body
    );
};

export default VastModal;
