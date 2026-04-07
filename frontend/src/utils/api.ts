import { getApiBaseUrl } from './runtimeUrls';

const API_BASE = getApiBaseUrl();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      if (Array.isArray(data.detail)) {
        message = data.detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ');
      } else {
        message = data.detail || message;
      }
    } catch { }

    // Provide clearer error messages for authentication issues
    if (res.status === 401) {
      // Use the backend's specific message if it exists (e.g. "Invalid email or password")
      // Otherwise fallback to session expired.
      const finalMessage = (message && message !== 'Unauthorized')
        ? message
        : 'Please log in to continue. Your session may have expired.';
      throw new Error(finalMessage);
    }

    throw new Error(message);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// Helper to get auth headers with token
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  } : {
    'Content-Type': 'application/json'
  };
}

export type LoginResponse = { access_token: string; token_type: string };

export interface DeployContainerRequest {
  name: string;
  deployment_type: 'dockerhub' | 'github' | 'simulated';

  // For Docker Hub
  image?: string;
  docker_username?: string;
  docker_password?: string;

  // For GitHub
  source_url?: string;
  git_username?: string;
  git_token?: string;
  github_branch?: string;
  dockerfile_path?: string;

  // Common
  port?: number;
  cpu_limit?: number;
  memory_limit?: number;
  environment_vars?: Record<string, string>;
}

export interface Container {
  id: number;
  user_id: number;
  name: string;
  image: string;
  status: 'pending' | 'running' | 'stopped' | 'error';
  port: number | null;
  cpu_limit: number;
  memory_limit: number;
  environment_vars: Record<string, string>;

  // Deployment fields
  deployment_type?: string;
  source_url?: string;
  build_status?: string;
  container_id?: string;
  localhost_url?: string;
  public_url?: string;

  created_at: string;
  updated_at: string;
  started_at: string | null;
  stopped_at: string | null;
}

export interface ContainerListResponse {
  containers: Container[];
  total: number;
}

export interface ContainerActionResponse {
  ok: boolean;
  message: string;
  container?: Container;
}

export interface ContainerLogsResponse {
  logs: string[];
  container_name: string;
  status: string;
}

export const api = {
  post: request,
  login: (email: string, password: string) =>
    request<LoginResponse>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, role: 'student' | 'teacher' | 'admin') =>
    request(`/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),
  requestVerifyEmail: (email: string) =>
    request(`/auth/verify/request`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  confirmVerifyEmail: (token: string) =>
    request(`/auth/verify/confirm`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  forgotPassword: (email: string) =>
    request(`/auth/password/forgot`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, new_password: string) =>
    request(`/auth/password/reset`, {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),

  // Container management methods
  deployContainer: (data: DeployContainerRequest) =>
    request<Container>(`/containers/deploy`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),
  listContainers: (status?: string) =>
    request<ContainerListResponse>(
      `/containers${status ? `?status=${status}` : ''}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    ),
  getContainer: (id: number) =>
    request<Container>(`/containers/${id}`, {
      method: 'GET',
      headers: authHeaders(),
    }),
  startContainer: (id: number) =>
    request<ContainerActionResponse>(`/containers/${id}/start`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  stopContainer: (id: number) =>
    request<ContainerActionResponse>(`/containers/${id}/stop`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  deleteContainer: (id: number) =>
    request<ContainerActionResponse>(`/containers/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
  getContainerLogs: (id: number) =>
    request<ContainerLogsResponse>(`/containers/${id}/logs`, {
      method: 'GET',
      headers: authHeaders(),
    }),
};

// Monitoring interfaces
export interface ContainerStats {
  id: number;
  name: string;
  container_id: string | null;
  status: string;
  cpu_percent: number;
  memory_usage_mb: number;
  memory_limit_mb: number;
  memory_percent: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
  network_rx_mb: number;
  network_tx_mb: number;
  timestamp: string;
}

export interface MonitoringOverview {
  total_containers: number;
  running_containers: number;
  stopped_containers: number;
  total_cpu_percent: number;
  total_memory_usage_mb: number;
  containers_stats: ContainerStats[];
}

export const monitoring = {
  getAllStats: () =>
    request<ContainerStats[]>('/monitoring/containers', {
      method: 'GET',
      headers: authHeaders(),
    }),
  getContainerStats: (id: number) =>
    request<ContainerStats>(`/monitoring/containers/${id}`, {
      method: 'GET',
      headers: authHeaders(),
    }),
  getOverview: () =>
    request<MonitoringOverview>('/monitoring/overview', {
      method: 'GET',
      headers: authHeaders(),
    }),
};

// Billing interfaces
export interface PricingProvider {
  provider: 'aws' | 'gcp' | 'azure';
  cpu_per_hour: number;
  memory_per_gb_hour: number;
  storage_per_gb_month: number;
  storage_ssd_per_gb_month?: number;
  storage_hdd_per_gb_month?: number;
}

export interface UsageMetric {
  timestamp: string;
  cpu_percent: number;
  cpu_cores: number;
  memory_mb: number;
  memory_gb: number;
  storage_gb: number;
}

export interface CostBreakdown {
  cpu_cost: number;
  memory_cost: number;
  storage_cost: number;
  total_cost: number;
  provider: string;
}

export interface RealTimeBillingResponse {
  container_id: number;
  time_range: {
    start: string;
    end: string;
    hours: number;
  };
  average_usage: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
  };
  costs: CostBreakdown;
  usage_history: UsageMetric[];
}

export interface ScenarioSimulationResponse {
  scenario: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
    duration_hours: number;
  };
  costs: CostBreakdown;
  cost_breakdown: {
    cpu: { usage: string; rate: string; cost: number };
    memory: { usage: string; rate: string; cost: number };
    storage: { usage: string; rate: string; cost: number };
  };
}

export const billing = {
  getPricingModels: () =>
    request<{ pricing_models: PricingProvider[] }>('/billing/pricing-models', {
      method: 'GET',
      headers: authHeaders(),
    }),
  calculateRealTimeBilling: (data: {
    container_id: number;
    provider: 'aws' | 'gcp' | 'azure';
    hours_back: number;
  }) =>
    request<{ success: boolean; container: any; billing: RealTimeBillingResponse }>(
      '/billing/real-time/calculate',
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      }
    ),
  simulateScenario: (
    cpu_cores: number,
    memory_gb: number,
    storage_gb: number,
    duration_hours: number,
    provider: 'aws' | 'gcp' | 'azure'
  ) =>
    request<{ success: boolean; simulation: ScenarioSimulationResponse }>(
      '/billing/scenario/simulate',
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          cpu_cores,
          memory_gb,
          storage_gb,
          duration_hours,
          provider,
        }),
      }
    ),
  collectMetrics: (container_id: number) =>
    request('/billing/collect-metrics', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ container_id }),
    }),
  getUsageHistory: (container_id: number, hours_back: number = 24) =>
    request<{
      container_id: number;
      time_range: any;
      usage_count: number;
      usage_history: UsageMetric[];
    }>(`/billing/usage-history/${container_id}?hours_back=${hours_back}`, {
      method: 'GET',
      headers: authHeaders(),
    }),
  getUserContainers: () =>
    request<{ containers: Container[] }>('/billing/containers', {
      method: 'GET',
      headers: authHeaders(),
    }),
};

// Dashboard interfaces
export interface DashboardMetrics {
  total_containers: number;
  running_containers: number;
  stopped_containers: number;
  recent_load_tests: {
    id: number;
    status: string;
    created_at: string;
    requests: number;
    avg_response_time: number | null;
  }[];
  system_status: string;
}

export const dashboard = {
  getMetrics: () =>
    request<DashboardMetrics>('/dashboard/metrics', {
      method: 'GET',
      headers: authHeaders(),
    }),
};

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  is_verified: boolean;
  created_at: string;
  containers_count: number;
  status: 'active' | 'pending' | 'suspended';
  last_login?: string | null;
}

export interface AdminSystemService {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'degraded' | 'error';
  uptime: string;
  cpu: number;
  memory: number;
  last_check: string;
}

export interface AdminSystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  active_connections: number;
  request_rate: number;
  error_rate: number;
}

export interface AdminSystemOverview {
  services: AdminSystemService[];
  metrics: AdminSystemMetrics;
}

export const adminApi = {
  listUsers: () =>
    request<AdminUser[]>('/admin/users', {
      method: 'GET',
      headers: authHeaders(),
    }),
  updateUserRole: (userId: number, role: 'student' | 'teacher' | 'admin') =>
    request<AdminUser>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ role }),
    }),
  deleteUser: (userId: number) =>
    request<void>(`/admin/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
  getSystemsOverview: () =>
    request<AdminSystemOverview>('/admin/systems/overview', {
      method: 'GET',
      headers: authHeaders(),
    }),
};

export interface TeacherClass {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  semester: string;
  status: 'active' | 'archived' | 'upcoming';
  max_students: number;
  student_count: number;
  deployments_count: number;
  created_at: string;
}

export interface TeacherClassCreate {
  name: string;
  code: string;
  description?: string;
  semester: string;
  max_students: number;
}

export interface ClassroomStudent {
  id: number;
  name: string;
  email: string;
  enrolled_at: string | null;
}

export interface ClassroomEnrollmentAction {
  message: string;
}

export const classesApi = {
  listTeacherClasses: () =>
    request<TeacherClass[]>('/classes/teacher', {
      method: 'GET',
      headers: authHeaders(),
    }),
  createTeacherClass: (payload: TeacherClassCreate) =>
    request<TeacherClass>('/classes/teacher', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  getClassStudents: (classroomId: number) =>
    request<ClassroomStudent[]>(`/classes/teacher/${classroomId}/students`, {
      method: 'GET',
      headers: authHeaders(),
    }),
  getAvailableStudents: (classroomId: number) =>
    request<ClassroomStudent[]>(`/classes/teacher/${classroomId}/available-students`, {
      method: 'GET',
      headers: authHeaders(),
    }),
  enrollStudent: (classroomId: number, studentId: number) =>
    request<ClassroomEnrollmentAction>(`/classes/teacher/${classroomId}/students/${studentId}`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  removeStudent: (classroomId: number, studentId: number) =>
    request<ClassroomEnrollmentAction>(`/classes/teacher/${classroomId}/students/${studentId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
};

export interface LoadTestProfile {
  name: 'easy' | 'medium' | 'heavy';
  label: string;
  total_requests: number;
  concurrency: number;
  duration_seconds: number;
}

export const loadTestApi = {
  listProfiles: () =>
    request<LoadTestProfile[]>('/loadtest/profiles', {
      method: 'GET',
      headers: authHeaders(),
    }),
};

// Export API base URL for components that need it directly
export { API_BASE };

// Autoscaling interfaces
export interface ScalingPolicy {
  id: number;
  container_id: number;
  user_id: number;
  enabled: boolean;
  scale_up_cpu_threshold: number;
  scale_up_memory_threshold: number;
  scale_down_cpu_threshold: number;
  scale_down_memory_threshold: number;
  min_replicas: number;
  max_replicas: number;
  cooldown_period: number;
  evaluation_period: number;
  load_balancer_enabled: boolean;
  load_balancer_port: number | null;
  created_at: string;
  updated_at: string | null;
  last_scaled_at: string | null;
}

export interface ScalingEvent {
  id: number;
  policy_id: number;
  container_id: number;
  action: string;
  trigger_metric: string;
  metric_value: number;
  replica_count_before: number;
  replica_count_after: number;
  created_at: string;
}

export interface CreatePolicyRequest {
  container_id: number;
  scale_up_cpu_threshold: number;
  scale_up_memory_threshold: number;
  scale_down_cpu_threshold: number;
  scale_down_memory_threshold: number;
  min_replicas: number;
  max_replicas: number;
  cooldown_period: number;
  evaluation_period: number;
  load_balancer_enabled?: boolean;
  load_balancer_port?: number | null;
}

export const autoscaling = {
  getPolicies: () =>
    request<ScalingPolicy[]>('/autoscaling/policies', {
      method: 'GET',
      headers: authHeaders(),
    }),
  createPolicy: (data: CreatePolicyRequest) =>
    request<ScalingPolicy>('/autoscaling/policies', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),
  togglePolicy: (policyId: number) =>
    request<ScalingPolicy>(`/autoscaling/policies/${policyId}/toggle`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  deletePolicy: (policyId: number) =>
    request<void>(`/autoscaling/policies/${policyId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
  getEvents: (limit: number = 50) =>
    request<ScalingEvent[]>(`/autoscaling/events?limit=${limit}`, {
      method: 'GET',
      headers: authHeaders(),
    }),
  evaluateNow: () =>
    request<{ status: string; message: string }>('/autoscaling/evaluate-now', {
      method: 'POST',
      headers: authHeaders(),
    }),
};

// Docker Hub interfaces
export interface DockerHubImage {
  name: string;
  namespace: string;
  full_name: string;
  description: string;
  star_count: number;
  pull_count: number;
  pull_count_formatted: string;
  is_official: boolean;
  is_automated: boolean;
  last_updated?: string;
  logo_url?: string;
}

export interface DockerHubTag {
  name: string;
  full_size: number;
  size_formatted: string;
  last_updated: string;
  digest?: string;
}

export const dockerhub = {
  search: (query: string, page: number = 1, pageSize: number = 25, officialOnly: boolean = false) =>
    request<{
      success: boolean;
      total_count: number;
      page: number;
      page_size: number;
      images: DockerHubImage[];
    }>(`/dockerhub/search?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}&official_only=${officialOnly}`, {
      method: 'GET',
      headers: authHeaders(),
    }),
  getPopular: (category?: string, limit: number = 20) =>
    request<{
      success: boolean;
      count: number;
      category?: string;
      images: DockerHubImage[];
    }>(`/dockerhub/popular?${category ? `category=${category}&` : ''}limit=${limit}`, {
      method: 'GET',
      headers: authHeaders(),
    }),
  getCategories: () =>
    request<{
      success: boolean;
      categories: Record<string, string[]>;
    }>('/dockerhub/categories', {
      method: 'GET',
      headers: authHeaders(),
    }),
  getImageDetails: (namespace: string, imageName: string) =>
    request<{
      success: boolean;
      image: DockerHubImage;
      tags: DockerHubTag[];
    }>(`/dockerhub/image/${namespace}/${imageName}`, {
      method: 'GET',
      headers: authHeaders(),
    }),
  getFeatured: () =>
    request<{
      success: boolean;
      featured: Array<{
        name: string;
        namespace: string;
        description: string;
        image_string: string;
      }>;
    }>('/dockerhub/featured', {
      method: 'GET',
      headers: authHeaders(),
    }),
};
