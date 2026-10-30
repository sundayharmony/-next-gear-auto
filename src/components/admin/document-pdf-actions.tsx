"use client";

import { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadAdminPdf, previewAdminPdf } from "@/lib/utils/open-admin-pdf";

type DocumentPdfActionsProps = {
  previewUrl: string;
  downloadUrl: string;
  downloadFilename: string;
  onError?: (message: string) => void;
  className?: string;
};

export function DocumentPdfActions({
  previewUrl,
  downloadUrl,
  downloadFilename,
  onError,
  className,
}: DocumentPdfActionsProps) {
  const [previewing, setPreviewing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const run = async (action: "preview" | "download") => {
    const setBusy = action === "preview" ? setPreviewing : setDownloading;
    setBusy(true);
    try {
      if (action === "preview") await previewAdminPdf(previewUrl);
      else await downloadAdminPdf(downloadUrl, downloadFilename);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "PDF failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={previewing || downloading}
        onClick={() => void run("preview")}
      >
        {previewing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />}
        Preview PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={previewing || downloading}
        onClick={() => void run("download")}
      >
        {downloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
        Download PDF
      </Button>
    </div>
  );
}
