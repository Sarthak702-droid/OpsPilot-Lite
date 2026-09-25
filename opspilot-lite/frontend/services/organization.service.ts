import { api } from "@/lib/api-client";
import type { ListResponse, Member, Organization, RiskSettings } from "@/types/api";
export const getOrganization = (token: string | null) => api<Organization>("/api/organization/me", token);
export const getRiskSettings = (token: string | null) => api<RiskSettings>("/api/organization/settings", token);
export const saveRiskSettings = (token: string | null, input: RiskSettings) => api<RiskSettings>("/api/organization/settings", token, { method: "PATCH", body: JSON.stringify(input) });
export const getMembers = (token: string | null) => api<ListResponse<Member>>("/api/organization/users", token);
export const inviteMember = (token: string | null, input: { email: string; role: string }) => api<{ token: string; email: string; role: string }>("/api/organization/invitations", token, { method: "POST", body: JSON.stringify(input) });
export const acceptInvitation = (token: string | null, inviteToken: string) => api<{ organization_id: string }>("/api/organization/invitations/accept", token, { method: "POST", body: JSON.stringify({ token: inviteToken }) });
export const updateMemberRole = (token: string | null, id: string, role: string) => api<{ id: string; role: string }>(`/api/organization/users/${id}/role`, token, { method: "PATCH", body: JSON.stringify({ role }) });
