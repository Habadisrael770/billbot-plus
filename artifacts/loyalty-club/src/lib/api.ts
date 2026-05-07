export interface LoyaltyMember {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  joinedAt: string | null;
  onboardingStep: number;
  whatsappOptIn: boolean;
  whatsappSentAt: string | null;
  optInAt: string | null;
  notes: string | null;
}

export interface Stats {
  total: number;
  fullyOnboarded: number;
  pendingStep1: number;
  pendingStep2: number;
  optedIn: number;
  recentCount: number;
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  notes?: string;
}

export interface RegisterResponse {
  success: boolean;
  member: LoyaltyMember;
  whatsappSent: boolean;
}

const API_BASE = "/api/loyalty";

export async function registerMember(data: RegisterPayload): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to register member");
  return res.json();
}

export async function getMembers(): Promise<LoyaltyMember[]> {
  const res = await fetch(`${API_BASE}/members`);
  if (!res.ok) throw new Error("Failed to fetch members");
  return res.json();
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function deleteMember(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/members/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete member");
}

export async function resendWhatsApp(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/resend/${id}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to resend WhatsApp");
}
