export interface Product {
  id: string;
  name: string;
  category?: string;
  createdAt: string;
}

export interface HealthResponse {
  status: "ok" | "error";
  uptime: number;
  timestamp: string;
}
