"use client";
import Editor from "@/features/editor";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { dispatch } from "@designcombo/events";
import { DESIGN_LOAD } from "@designcombo/state";

function uid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function buildDesign(clips: any[], projectId: string) {
  const trackItemsMap: Record<string, any> = {};
  const trackItemIds: string[] = [];
  const videoItems: string[] = [];
  
  clips.forEach((clip, i) => {
    const id = uid();
    trackItemIds.push(id);
    videoItems.push(id);
    const durationMs = (clip.duration || 10) * 1000;
    trackItemsMap[id] = {
      id, type: "video", name: clip.name || `clip_${i + 1}`,
      details: {
        src: `/download/${projectId}/${clip.name}`,
        width: 1080, height: 1920, opacity: 100, volume: 100,
        borderRadius: 0, borderWidth: 0, borderColor: "#000000",
        blur: 0, brightness: 100, flipX: false, flipY: false,
        rotate: "0deg", visibility: "visible",
        top: "0px", left: "0px", transform: "none",
        boxShadow: { color: "#000000", x: 0, y: 0, blur: 0 },
      },
      metadata: { previewUrl: `/download/${projectId}/${clip.name}` },
      trim: { from: 0, to: durationMs },
      display: { from: 0, to: durationMs },
      duration: durationMs, playbackRate: 1, isMain: i === 0,
    };
  });

  return {
    id: projectId, fps: 30,
    size: { width: 1080, height: 1920 },
    tracks: [{
      id: uid(), type: "video", name: "Video",
      items: videoItems,
      accepts: ["text", "image", "video", "audio", "caption"],
      magnetic: false, static: false,
    }],
    trackItemIds, trackItemsMap, transitionsMap: {},
  };
}

export default function ProjectEditor() {
  const params = useParams();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [designData, setDesignData] = useState<any>(null);
  const editorReady = useRef(false);

  // Step 1: Fetch clips
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/editor/${projectId}/clips`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const design = buildDesign(data.clips, projectId as string);
        setDesignData(design);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [projectId]);

  // Step 2: After Editor mounts + designData ready, dispatch
  useEffect(() => {
    if (!designData || editorReady.current) return;
    editorReady.current = true;
    // Small delay to let Editor's stateManager initialize
    const t = setTimeout(() => {
      dispatch(DESIGN_LOAD, { payload: designData });
    }, 800);
    return () => clearTimeout(t);
  }, [designData]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading project {projectId}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">Error</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return <Editor tempId={projectId as string} />;
}
