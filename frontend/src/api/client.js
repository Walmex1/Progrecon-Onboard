import axios from "axios";
import { toast } from "react-toastify";

const client = axios.create({
  baseURL: "http://localhost:8744",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;

    if (status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    } else if (status === 403) {
      toast.error("Nincs jogosultságod ehhez a művelethez.");
    } else if (status === 404) {
      toast.error("A keresett rekord nem található.");
    } else if (status === 422) {
      const url = err.config?.url ?? "";
      const method = (err.config?.method ?? "").toLowerCase();
      const isSubmitUrl = url.includes("/entries/") && url.includes("/submit") && method === "post";
      const isEntryCreate = url === "/entries/" && method === "post";
      if (!isSubmitUrl && !isEntryCreate) {
        toast.warning("Hiányos vagy hibás adatok.");
      }
    } else if (status === 500) {
      toast.error("Szerverhiba történt, próbáld újra.");
    } else if (!err.response) {
      toast.error("A szerver nem érhető el. Ellenőrizd a kapcsolatot.");
    }

    return Promise.reject(err);
  }
);

export default client;
