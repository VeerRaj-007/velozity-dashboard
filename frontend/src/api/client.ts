import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshingPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshingPromise) {
        refreshingPromise = axios
          .post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true })
          .then((res) => {
            setAccessToken(res.data.accessToken);
            return res.data.accessToken as string;
          })
          .catch(() => {
            setAccessToken(null);
            return null;
          })
          .finally(() => {
            refreshingPromise = null;
          });
      }
      const newToken = await refreshingPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);
