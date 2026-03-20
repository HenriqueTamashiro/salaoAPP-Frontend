import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type ServiceCategory = 'HAIR' | 'NAILS' | 'FACE' | 'MASSAGE' | 'MAKEUP' | 'OTHER';
export type UserRole = 'CLIENT' | 'PROFESSIONAL' | 'ADMIN';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    userId: string;
  };
  professional?: Professional;
  appointments?: Appointment[];
  appointmentsTotal?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string | null;
  };
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number | string;
  durationMin: number;
  category: ServiceCategory;
  imageUrl?: string | null;
  isActive: boolean;
}

export interface Professional {
  id: string;
  bio?: string | null;
  specialties: string[];
  isAvailable: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
}

export interface Appointment {
  id: string;
  scheduledAt: string;
  endsAt: string;
  status: AppointmentStatus;
  totalPrice: number | string;
  notes?: string | null;
  cancelReason?: string | null;
  service?: Service;
  professional?: Professional;
  client?: {
    id: string;
    userId: string;
    user?: UserProfile;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

function extractHost(candidate?: string | null) {
  if (!candidate) return null;

  const normalized = candidate
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .split('/')[0]
    .split(':')[0];

  return normalized || null;
}

function getDefaultApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  const constantsWithExpoGo = Constants as typeof Constants & {
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
    linkingUri?: string;
  };

  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    constantsWithExpoGo.expoGoConfig?.debuggerHost,
    constantsWithExpoGo.manifest2?.extra?.expoGo?.debuggerHost,
    constantsWithExpoGo.linkingUri,
  ];

  for (const candidate of hostCandidates) {
    const host = extractHost(candidate);
    if (host) {
      return `http://${host}:3333/api`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3333/api';
  }

  return 'http://localhost:3333/api';
}

const API_BASE_URL = getDefaultApiBaseUrl();

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, body, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body,
  });

  if (!response.ok) {
    let message = 'Erro ao conectar com o servidor';

    try {
      const errorData = await response.json();
      if (typeof errorData?.message === 'string') {
        message = errorData.message;
      } else if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
        message = errorData.errors.map((item: { message?: string }) => item.message).filter(Boolean).join('\n');
      }
    } catch {
      message = `${message} (${response.status})`;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function login(payload: { email: string; password: string }) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function register(payload: { name: string; email: string; phone?: string; password: string }) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getProfile(token: string) {
  return request<UserProfile>('/auth/profile', { token });
}

export async function updateProfile(
  token: string,
  payload: { name?: string; email?: string; phone?: string; password?: string; avatarUrl?: string }
) {
  return request<UserProfile>('/auth/profile', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export async function listServices(category?: ServiceCategory) {
  const search = category ? `?category=${category}` : '';
  return request<{ services: Service[]; total: number }>(`/services${search}`);
}

export async function listProfessionals() {
  return request<{ professionals: Professional[]; total: number }>('/professionals');
}

export async function listAvailableProfessionals(
  serviceId: string,
  date: string,
  excludeAppointmentId?: string
) {
  const params = new URLSearchParams({ serviceId, date });
  if (excludeAppointmentId) {
    params.set('excludeAppointmentId', excludeAppointmentId);
  }
  return request<Professional[]>(`/professionals/available?${params.toString()}`);
}

export async function createAppointment(
  token: string,
  payload: { professionalId: string; serviceId: string; scheduledAt: string; notes?: string }
) {
  return request<Appointment>('/appointments', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function listAppointments(token: string) {
  return request<{ appointments: Appointment[]; total: number }>('/appointments', { token });
}

export async function cancelAppointment(token: string, appointmentId: string, cancelReason?: string) {
  return request<Appointment>(`/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ cancelReason }),
  });
}

export async function acceptAppointment(token: string, appointmentId: string) {
  return request<Appointment>(`/appointments/${appointmentId}/accept`, {
    method: 'PATCH',
    token,
  });
}

export async function rescheduleAppointment(
  token: string,
  appointmentId: string,
  payload: { scheduledAt: string; notes?: string }
) {
  return request<Appointment>(`/appointments/${appointmentId}/reschedule`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export async function listNotifications(token: string, unread?: boolean) {
  const search = unread ? '?unread=true' : '';
  return request<Notification[]>(`/notifications${search}`, { token });
}

export async function markAllNotificationsAsRead(token: string) {
  return request<void>('/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}

export async function sendContactMessage(payload: ContactPayload) {
  return request<{ message: string; id: string }>('/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export { API_BASE_URL };





