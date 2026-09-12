/**
 * Profile API Client（S1.45）
 */
import { http } from "./client";

export interface ProfileUserDTO {
  displayName: string | null;
  title: string | null;
  bio: string | null;
  avatarColor: string | null;
  avatarUrl: string | null;
  updatedAt: string;
}

export interface MachineInfoDTO {
  username: string;
  hostname: string;
  platform: string;
  osRelease: string;
  dbPath: string;
  dbSizeBytes: number;
  llmSource: string;
  llmModel: string;
  llmConfigured: boolean;
  resourcesTotal: number;
  harnessScansTotal: number;
}

export interface ProfileDTO {
  user: ProfileUserDTO;
  machine: MachineInfoDTO;
}

export interface SaveProfileInput {
  displayName?: string | null;
  title?: string | null;
  bio?: string | null;
  avatarColor?: string | null;
}

export const getProfile = () => http.get<ProfileDTO>("/profile");

export const saveProfile = (input: SaveProfileInput) =>
  http.put<{ user: ProfileUserDTO }>("/profile", input);

export const uploadProfileAvatar = (dataUrl: string) =>
  http.post<{ avatarUrl: string }>("/profile/avatar", { dataUrl });

export const clearProfileAvatar = () =>
  http.del<{ avatarUrl: null }>("/profile/avatar");
