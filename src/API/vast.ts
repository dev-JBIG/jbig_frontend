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
    jupyter_port?: number;        // default 8888
    jupyter_token: string;        // we'll generate client-side
    ssh_key?: string;             // optional user ssh key
    env?: Record<string, string>;
}

export interface VastInstanceInfo {
    id: number | string;
    status: string;               // e.g., running, starting, busy
    public_ip?: string;
    ports?: any;
}

const API_BASE = "/api/gpu";

export async function vastListOffers(filter: VastOfferFilter): Promise<VastOfferSummary[]> {
    const payload: any = {};
    if (filter.gpu_name) payload.gpu_name = filter.gpu_name;
    if (filter.min_vram_gb) payload.min_vram_gb = filter.min_vram_gb; // common field name in examples
    if (filter.num_gpus) payload.num_gpus = filter.num_gpus;
    if (filter.max_hourly_price) payload.max_hourly_price = filter.max_hourly_price;

    const res = await axios.post(`${API_BASE}/offers`, payload, {
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        withCredentials: false,
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

export async function vastCreateInstance(p: VastCreateInstanceParams): Promise<VastInstanceInfo> {
    const port = p.jupyter_port ?? 8888;
    const env = {
        JUPYTER_TOKEN: p.jupyter_token,
        ...p.env,
    } as Record<string, string>;

    const onstart = [
        `mkdir -p /root/work`,
        `pip install --upgrade pip jupyterlab --quiet || true`,
        `jupyter lab --ip=0.0.0.0 --port=${port} --no-browser --ServerApp.token=${p.jupyter_token} --ServerApp.allow_origin='*' --ServerApp.allow_remote_access=True --NotebookApp.notebook_dir=/root/work &`,
    ].join(" && ");

    const payload: any = {
        bundle_id: p.offer_id,
        image: p.image,
        disk: p.disk_gb,
        onstart,
        env,
        ports: [{ port, proto: "tcp", public: true }],
    };

    const res = await axios.post(`${API_BASE}/instances`, payload, {
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        withCredentials: false,
    });
    const d = res.data as any;
    return { id: d.id ?? d.instance_id, status: d.status ?? "starting", public_ip: d.public_ip, ports: d.ports };
}

export async function vastGetInstance(id: string | number): Promise<VastInstanceInfo> {
    const res = await axios.get(`${API_BASE}/instances/${id}`, {
        headers: { Accept: "application/json" },
        withCredentials: false,
    });
    const d = res.data as any;
    return { id: d.id ?? id, status: d.status ?? d.state ?? "unknown", public_ip: d.public_ip, ports: d.ports };
}

export async function vastDeleteInstance(id: string | number): Promise<void> {
    await axios.delete(`${API_BASE}/instances/${id}`, {
        headers: { Accept: "application/json" },
        withCredentials: false,
    });
}


