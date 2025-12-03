import axios from "axios";

export interface VastOfferFilter { max_hourly_price?: number; }
export interface VastOffer { id: number; gpu_name: string; vram_gb: number; hourly_price: number; reliability: number; }
export interface VastInstance { id: number | string; status: string; jupyter_url?: string; expires_at?: string; }

const API = "/api/gpu";
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

export async function vastListOffers(filter: VastOfferFilter, token: string): Promise<VastOffer[]> {
    const res = await axios.post(`${API}/offers`, { max_hourly_price: filter.max_hourly_price }, { headers: headers(token) });
    return (res.data || []).map((o: any) => ({
        id: o.id, gpu_name: o.gpu_name ?? "GPU", vram_gb: o.vram_gb ?? 0,
        hourly_price: o.hourly_price ?? 0, reliability: o.reliability ?? 0,
    }));
}

export async function vastCreateInstance(p: { offer_id: number; image: string; disk_gb: number; gpu_name?: string; hourly_price?: number }, token: string): Promise<VastInstance> {
    const res = await axios.post(`${API}/instances`, { bundle_id: p.offer_id, image: p.image, disk: p.disk_gb, gpu_name: p.gpu_name, hourly_price: p.hourly_price }, { headers: headers(token) });
    return { id: res.data.id, status: res.data.status ?? "starting", expires_at: res.data.expires_at };
}

export async function vastGetInstance(id: string | number, token: string): Promise<VastInstance> {
    const res = await axios.get(`${API}/instances/${id}`, { headers: headers(token) });
    return { id: res.data.id ?? id, status: res.data.status ?? "unknown", jupyter_url: res.data.jupyter_url, expires_at: res.data.expires_at };
}

export async function vastExtendInstance(id: string | number, token: string): Promise<{ expires_at: string }> {
    const res = await axios.patch(`${API}/instances/${id}`, {}, { headers: headers(token) });
    return { expires_at: res.data.expires_at };
}

export async function vastDeleteInstance(id: string | number, token: string): Promise<void> {
    await axios.delete(`${API}/instances/${id}`, { headers: headers(token) });
}

export async function vastGetMyInstances(token: string): Promise<VastInstance[]> {
    const res = await axios.get(`${API}/instances/my`, { headers: headers(token) });
    return res.data || [];
}
