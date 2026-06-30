import { IDesign } from "@designcombo/types";
import { create } from "zustand";
interface Output {
  url: string;
  type: string;
}

interface DownloadState {
  projectId: string;
  exporting: boolean;
  exportType: "json" | "mp4";
  progress: number;
  error: string | null;
  output?: Output;
  payload?: IDesign;
  displayProgressModal: boolean;
  actions: {
    setProjectId: (projectId: string) => void;
    setExporting: (exporting: boolean) => void;
    setExportType: (exportType: "json" | "mp4") => void;
    setProgress: (progress: number) => void;
    setState: (state: Partial<DownloadState>) => void;
    setOutput: (output: Output) => void;
    setError: (error: string | null) => void;
    startExport: () => void;
    setDisplayProgressModal: (displayProgressModal: boolean) => void;
  };
}

//const baseUrl = "https://api.combo.sh/v1";

export const useDownloadState = create<DownloadState>((set, get) => ({
  projectId: "",
  exporting: false,
  exportType: "mp4",
  progress: 0,
  error: null,
  displayProgressModal: false,
  actions: {
    setProjectId: (projectId) => set({ projectId }),
    setExporting: (exporting) => set({ exporting }),
    setExportType: (exportType) => set({ exportType }),
    setProgress: (progress) => set({ progress }),
    setState: (state) => set({ ...state }),
    setOutput: (output) => set({ output }),
    setError: (error) => set({ error }),
    setDisplayProgressModal: (displayProgressModal) =>
      set({ displayProgressModal }),
    startExport: async () => {
      try {
        // Set exporting to true at the start
        set({ exporting: true, displayProgressModal: true });

        // Assume payload to be stored in the state for POST request
        const { payload } = get();

        if (!payload) throw new Error("Payload is not defined");

        // Step 1: POST request to start rendering (local FFmpeg)
        const response = await fetch(`/api/render-local`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            design: payload,
            options: {
              fps: 30,
              size: payload.size,
              format: "mp4"
            }
          })
        });

        if (!response.ok) throw new Error("Failed to submit export request.");

        const jobInfo = await response.json();
        const { status, progress, presigned_url: url } = jobInfo.render;

        set({ progress });

        if (status === "COMPLETED") {
          // Render selesai langsung — ga perlu polling
          set({ exporting: false, output: { url, type: get().exportType } });
        } else if (status === "PROCESSING" || status === "PENDING") {
          // Async render — polling
          const jobId = jobInfo.render.id;
          const checkStatus = async () => {
            const statusResponse = await fetch(`/api/render/${jobId}`, {
              headers: {
                "Content-Type": "application/json"
              }
            });

            if (!statusResponse.ok)
              throw new Error("Failed to fetch export status.");

            const statusInfo = await statusResponse.json();
            const { status: s, progress: p, presigned_url: u } = statusInfo.render;

            set({ progress: p });

            if (s === "COMPLETED") {
              set({ exporting: false, output: { url: u, type: get().exportType } });
            } else if (s === "PROCESSING" || s === "PENDING") {
              setTimeout(checkStatus, 2500);
            }
          };
          checkStatus();
        }
      } catch (error) {
        console.error(error);
        set({ exporting: false, error: (error as Error).message || 'Export failed' });
      }
    }
  }
}));
