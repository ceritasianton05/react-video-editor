import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Music,
  Image as ImageIcon,
  Video as VideoIcon,
  Loader2,
  UploadIcon,
  Upload,
  FolderOpen
} from "lucide-react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import useUploadStore from "../store/use-upload-store";
import ModalUpload from "@/components/modal-upload";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface GalleryClip {
  project_id: number;
  project_title: string;
  name: string;
  duration: number;
  url: string;
  preview_url: string;
}

export const Uploads = () => {
  const { setShowUploadModal, uploads, pendingUploads, activeUploads } =
    useUploadStore();
  const [galleryClips, setGalleryClips] = useState<GalleryClip[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [galleryError, setGalleryError] = useState("");
  const [activeTab, setActiveTab] = useState<"gallery" | "files">("gallery");

  // Fetch gallery clips from Flask
  useEffect(() => {
    fetch("/api/editor/my-clips")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load gallery");
        return res.json();
      })
      .then((data) => {
        setGalleryClips(data.clips || []);
        setLoadingGallery(false);
      })
      .catch((err) => {
        setGalleryError(err.message);
        setLoadingGallery(false);
      });
  }, []);

  // Group completed uploads by type
  const videos = uploads.filter(
    (upload) => upload.type?.startsWith("video/") || upload.type === "video"
  );
  const images = uploads.filter(
    (upload) => upload.type?.startsWith("image/") || upload.type === "image"
  );
  const audios = uploads.filter(
    (upload) => upload.type?.startsWith("audio/") || upload.type === "audio"
  );

  const handleAddVideo = (video: any) => {
    const srcVideo = video.metadata?.uploadedUrl || video.url;

    dispatch(ADD_VIDEO, {
      payload: {
        id: generateId(),
        details: {
          src: srcVideo
        },
        metadata: {
          previewUrl: ""
        }
      },
      options: {
        resourceId: "main",
        scaleMode: "fit"
      }
    });
  };

  const handleAddImage = (image: any) => {
    const srcImage = image.metadata?.uploadedUrl || image.url;

    dispatch(ADD_IMAGE, {
      payload: {
        id: generateId(),
        type: "image",
        display: {
          from: 0,
          to: 5000
        },
        details: {
          src: srcImage
        },
        metadata: {}
      },
      options: {}
    });
  };

  const handleAddAudio = (audio: any) => {
    const srcAudio = audio.metadata?.uploadedUrl || audio.url;
    dispatch(ADD_AUDIO, {
      payload: {
        id: generateId(),
        type: "audio",
        details: {
          src: srcAudio
        },
        metadata: {}
      },
      options: {}
    });
  };

  const handleAddGalleryClip = (clip: GalleryClip) => {
    dispatch(ADD_VIDEO, {
      payload: {
        id: generateId(),
        details: {
          src: clip.url
        },
        metadata: {
          previewUrl: clip.preview_url
        }
      },
      options: {
        resourceId: "main",
        scaleMode: "fit"
      }
    });
  };

  const UploadPrompt = () => (
    <div className="flex items-center justify-center p-4">
      <Button
        className="w-full cursor-pointer"
        onClick={() => {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({type: 'modalOverlay', open: true}, '*');
          }
          setShowUploadModal(true);
        }}
        variant={"outline"}
      >
        <UploadIcon className="w-4 h-4" />
        <span className="ml-2">Upload</span>
      </Button>
    </div>
  );

  const noUploads =
    pendingUploads.length === 0 &&
    activeUploads.length === 0 &&
    videos.length === 0 &&
    images.length === 0 &&
    audios.length === 0;

  const totalUploads = videos.length + images.length + audios.length;

  return (
    <div className="flex flex-1 flex-col">
      <ModalUpload />
      <UploadPrompt />

      {/* Tab buttons */}
      <div className="flex gap-0 px-4 pb-2 border-b border-border/60">
        <button
          onClick={() => setActiveTab("gallery")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md transition-all border-b-2",
            activeTab === "gallery"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent hover:text-foreground"
          )}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          My Gallery
          <span className="text-[10px] opacity-70">({galleryClips.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md transition-all border-b-2",
            activeTab === "files"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent hover:text-foreground"
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          Uploaded Files
          <span className="text-[10px] opacity-70">({totalUploads})</span>
        </button>
      </div>

      {/* ─── Gallery Tab ─── */}
      {activeTab === "gallery" && (
        <>
      {loadingGallery ? (
        <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading gallery...</span>
        </div>
      ) : galleryError ? (
        <div className="px-4 py-2">
          <div className="text-xs text-muted-foreground">
            Gallery: {galleryError}
          </div>
        </div>
      ) : galleryClips.length > 0 ? (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">My Gallery</span>
            <span className="text-xs text-muted-foreground">({galleryClips.length})</span>
          </div>
          <ScrollArea className="max-h-48">
            <div className="grid grid-cols-3 gap-2">
              {galleryClips.map((clip, idx) => (
                <div
                  key={`${clip.project_id}-${clip.name}-${idx}`}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                  onClick={() => handleAddGalleryClip(clip)}
                >
                  <Card className="w-full aspect-[9/16] max-h-24 flex items-center justify-center overflow-hidden relative bg-background hover:ring-1 hover:ring-primary/50 transition-all">
                    <video
                      src={clip.url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      onMouseEnter={(e) => {
                        const vid = e.currentTarget;
                        vid.currentTime = 0.1;
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all">
                      <VideoIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1 rounded">
                      {Math.round(clip.duration)}s
                    </div>
                  </Card>
                  <div className="text-[10px] text-muted-foreground truncate w-full text-center leading-tight">
                    {clip.project_title}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
          <Upload size={32} className="opacity-50" />
          <span className="text-sm">No uploads yet</span>
        </div>
      )}
        </>
      )}

      {/* Uploads in Progress — shows in both tabs */}
      {(pendingUploads.length > 0 || activeUploads.length > 0) && (
        <div className="p-4">
          <div className="font-medium text-sm mb-2 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            Uploads in Progress
          </div>
          <div className="flex flex-col gap-2">
            {pendingUploads.map((upload) => (
              <div key={upload.id} className="flex items-center gap-2">
                <span className="truncate text-xs flex-1">
                  {upload.file?.name || upload.url || "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
            ))}
            {activeUploads.map((upload) => (
              <div key={upload.id} className="flex items-center gap-2">
                <span className="truncate text-xs flex-1">
                  {upload.file?.name || upload.url || "Unknown"}
                </span>
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span className="text-xs">{upload.progress ?? 0}%</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {upload.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Files Tab ─── */}
      {activeTab === "files" && (
        <div className="flex flex-col gap-10 p-4">
          {/* Videos Section */}
          {videos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <VideoIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Videos</span>
              </div>
              <ScrollArea className="max-h-32">
                <div className="grid grid-cols-3 gap-2 max-w-full">
                  {videos.map((video, idx) => (
                    <div
                      className="flex items-center gap-2 flex-col w-full"
                      key={video.id || idx}
                    >
                      <div className="relative w-full">
                        <Card
                          className="w-full aspect-[9/16] max-h-20 flex items-center justify-center overflow-hidden relative cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all"
                          onClick={() => handleAddVideo(video)}
                        >
                          {(() => {
                            const src = video.metadata?.uploadedUrl || video.metadata?.originalUrl || video.url;
                            return src ? (
                              <video
                                src={src}
                                className="w-full h-full object-cover"
                                preload="metadata"
                              />
                            ) : (
                              <VideoIcon className="w-8 h-8 text-muted-foreground" />
                            );
                          })()}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all group">
                            <VideoIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Card>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const fileName = video.fileName || (video.metadata?.uploadedUrl || video.url || '').split('/').pop();
                            if (!fileName) return;
                            if (!confirm('Hapus ' + fileName + '?')) return;
                            fetch('/api/upload/delete', {
                              method: 'POST',
                              headers: {'Content-Type': 'application/json'},
                              body: JSON.stringify({filename: fileName})
                            }).then(r => r.json()).then(data => {
                              if (data.status === 'deleted') {
                                useUploadStore.getState().setUploads((prev: any[]) => prev.filter((v: any) => v.id !== video.id && v.fileName !== fileName));
                              }
                            }).catch(() => {});
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs z-10 hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Hapus"
                        >✕</button>
                      </div>
                      <div className="text-xs text-muted-foreground truncate w-full text-center">
                        {video.file?.name || video.url || "Video"}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Images Section */}
          {images.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Images</span>
              </div>
              <ScrollArea className="max-h-32">
                <div className="grid grid-cols-3 gap-2 max-w-full">
                  {images.map((image, idx) => (
                    <div
                      className="flex items-center gap-2 flex-col w-full"
                      key={image.id || idx}
                    >
                      <div className="relative w-full">
                        <Card
                          className="w-full aspect-square max-h-20 flex items-center justify-center overflow-hidden relative cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all"
                          onClick={() => handleAddImage(image)}
                        >
                          {(() => {
                            const src = image.metadata?.uploadedUrl || image.metadata?.originalUrl || image.url;
                            return src ? (
                              <img
                                src={src}
                                alt={image.file?.name || "Image"}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            );
                          })()}
                        </Card>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const fileName = image.fileName || (image.metadata?.uploadedUrl || image.url || '').split('/').pop();
                            if (!fileName) return;
                            if (!confirm('Hapus ' + fileName + '?')) return;
                            fetch('/api/upload/delete', {
                              method: 'POST',
                              headers: {'Content-Type': 'application/json'},
                              body: JSON.stringify({filename: fileName})
                            }).then(r => r.json()).then(data => {
                              if (data.status === 'deleted') {
                                useUploadStore.getState().setUploads((prev: any[]) => prev.filter((v: any) => v.id !== image.id && v.fileName !== fileName));
                              }
                            }).catch(() => {});
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs z-10 hover:bg-red-500 transition-colors opacity-0 hover:opacity-100"
                          title="Hapus"
                        >✕</button>
                      </div>
                      <div className="text-xs text-muted-foreground truncate w-full text-center">
                        {image.file?.name || image.url || "Image"}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Audios Section */}
          {audios.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Audios</span>
              </div>
              <ScrollArea className="max-h-32">
                <div className="grid grid-cols-3 gap-2 max-w-full">
                  {audios.map((audio, idx) => (
                    <div
                      className="flex items-center gap-2 flex-col w-full"
                      key={audio.id || idx}
                    >
                      <div className="relative w-full">
                        <Card
                          className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer"
                          onClick={() => handleAddAudio(audio)}
                        >
                          <Music className="w-8 h-8 text-muted-foreground" />
                        </Card>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const fileName = audio.fileName || (audio.url || '').split('/').pop();
                            if (!fileName) return;
                            if (!confirm('Hapus ' + fileName + '?')) return;
                            fetch('/api/upload/delete', {
                              method: 'POST',
                              headers: {'Content-Type': 'application/json'},
                              body: JSON.stringify({filename: fileName})
                            }).then(r => r.json()).then(data => {
                              if (data.status === 'deleted') {
                                useUploadStore.getState().setUploads((prev: any[]) => prev.filter((v: any) => v.id !== audio.id && v.fileName !== fileName));
                              }
                            }).catch(() => {});
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs z-10 hover:bg-red-500 transition-colors"
                          title="Hapus"
                        >✕</button>
                      </div>
                      <div className="text-xs text-muted-foreground truncate w-full text-center">
                        {audio.file?.name || audio.url || "Audio"}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
