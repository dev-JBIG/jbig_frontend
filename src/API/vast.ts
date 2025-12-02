import axios from "axios";

export interface VastOfferFilter {
    gpu_name?: string;            // e.g., "A100|L40S|3090"
    min_vram_gb?: number;         // e.g., 16
    num_gpus?: number;            // e.g., 1
    max_hourly_price?: number;    // USD/hour upper bound
}

export interface VastOfferSummary {
    id: number;
    gpu_name: string;
    vram_gb: number;
    hourly_price: number;
    reliability: number;
    hostname: string;
}

export interface VastCreateInstanceParams {
    offer_id: number;
    image: string;                // e.g., "pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime"
    disk_gb: number;              // e.g., 50
    gpu_name?: string;
    hourly_price?: number;
}

export interface VastInstanceInfo {
    id: number | string;
    status: string;               // e.g., running, starting, busy
    public_ip?: string;
    ports?: any;
    jupyter_url?: string;
    jupyter_token?: string;
    expires_at?: string;
}

const API_BASE = "/api/gpu";

function getAuthHeaders(token: string): Record<string, string> {
    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

export async function vastListOffers(filter: VastOfferFilter, token: string): Promise<VastOfferSummary[]> {
    const payload: any = {};
    if (filter.gpu_name) payload.gpu_name = filter.gpu_name;
    if (filter.min_vram_gb) payload.min_vram_gb = filter.min_vram_gb;
    if (filter.num_gpus) payload.num_gpus = filter.num_gpus;
    if (filter.max_hourly_price) payload.max_hourly_price = filter.max_hourly_price;

    const res = await axios.post(`${API_BASE}/offers`, payload, {
        headers: getAuthHeaders(token),
    });

    const items: any[] = Array.isArray(res.data) ? res.data : [];
    return items.slice(0, 50).map((o: any) => ({
        id: Number(o.id ?? o.offer_id ?? o.bundle_id),
        gpu_name: String(o.gpu_name ?? o.gpu_name_hr ?? "GPU"),
        vram_gb: Number(o.vram_gb ?? o.gpu_mem_gb ?? 0),
        hourly_price: Number(o.hourly_price ?? 0),
        reliability: Number(o.reliability ?? 0),
        hostname: String(o.hostname ?? ""),
    }));
}

export async function vastCreateInstance(p: VastCreateInstanceParams, token: string): Promise<VastInstanceInfo> {
    const payload: any = {
        bundle_id: p.offer_id,
        image: p.image,
        disk: p.disk_gb,
    };
    if (p.gpu_name) payload.gpu_name = p.gpu_name;
    if (p.hourly_price) payload.hourly_price = p.hourly_price;

    const res = await axios.post(`${API_BASE}/instances`, payload, {
        headers: getAuthHeaders(token),
    });
    const d = res.data as any;
    return {
        id: d.id ?? d.instance_id,
        status: d.status ?? "starting",
        jupyter_token: d.jupyter_token,
        expires_at: d.expires_at,
    };
}

export async function vastGetInstance(id: string | number, token: string): Promise<VastInstanceInfo> {
    const res = await axios.get(`${API_BASE}/instances/${id}`, {
        headers: getAuthHeaders(token),
    });
    const d = res.data as any;
    return {
        id: d.id ?? id,
        status: d.status ?? d.state ?? "unknown",
        public_ip: d.public_ip,
        ports: d.ports,
        jupyter_url: d.jupyter_url,
        expires_at: d.expires_at,
    };
}

export async function vastExtendInstance(id: string | number, token: string): Promise<{ expires_at: string }> {
    const res = await axios.patch(`${API_BASE}/instances/${id}`, {}, {
        headers: getAuthHeaders(token),
    });
    return { expires_at: res.data.expires_at };
}

export async function vastDeleteInstance(id: string | number, token: string): Promise<void> {
    await axios.delete(`${API_BASE}/instances/${id}`, {
        headers: getAuthHeaders(token),
    });
}
