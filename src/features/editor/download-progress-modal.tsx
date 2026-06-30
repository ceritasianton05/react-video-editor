import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDownloadState } from "./store/use-download-state";
import { Button } from "@/components/ui/button";
import { CircleCheckIcon, XCircleIcon } from "lucide-react";
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import { download } from "@/utils/download";

const DownloadProgressModal = () => {
  const { progress, displayProgressModal, output, error, actions } =
    useDownloadState();
  const isCompleted = progress === 100;

  const handleDownload = async () => {
    if (output?.url) {
      await download(output.url, "untitled.mp4");
      console.log("downloading");
    }
  };
  return (
    <Dialog
      open={displayProgressModal}
      onOpenChange={(open) => {
        if (!open) actions.setError(null);
        actions.setDisplayProgressModal(open);
      }}
    >
      <DialogContent className="flex h-[627px] flex-col gap-0 bg-background p-0 sm:max-w-[844px]">
        <DialogTitle className="hidden" />
        <DialogDescription className="hidden" />
        <div className="flex h-16 items-center border-b px-4 font-medium">
          Download
        </div>
        {isCompleted ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 space-y-4">
            <div className="flex flex-col items-center space-y-1 text-center">
              <div className="font-semibold">
                <CircleCheckIcon />
              </div>
              <div className="font-bold">Exported</div>
              <div className="text-muted-foreground">
                You can download the video to your device.
              </div>
            </div>
            <Button onClick={handleDownload}>Download</Button>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <XCircleIcon className="h-12 w-12 text-red-500" />
            <div className="font-bold text-red-500">Export Failed</div>
            <div className="text-center text-zinc-500 text-sm px-8">
              {error}
            </div>
            <Button variant={"outline"} onClick={() => actions.setDisplayProgressModal(false)}>Close</Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="text-5xl font-semibold">
              {Math.floor(progress)}%
            </div>
            <div className="font-bold">Exporting...</div>
            <div className="text-center text-zinc-500">
              <div>Closing the browser will not cancel the export.</div>
              <div>The video will be saved in your space.</div>
            </div>
            <Button variant={"outline"} onClick={() => { actions.setError(null); actions.setDisplayProgressModal(false); }}>Cancel</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DownloadProgressModal;
