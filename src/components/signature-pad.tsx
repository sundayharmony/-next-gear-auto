"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  label?: string;
  isInitials?: boolean;
}

export function SignaturePad({
  onSignatureChange,
  width = 400,
  height = 150,
  label = "Sign here",
  isInitials = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const padWidth = isInitials ? Math.min(width, 200) : width;
  const padHeight = isInitials ? Math.min(height, 80) : height;

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set display size
    canvas.style.width = `${padWidth}px`;
    canvas.style.height = `${padHeight}px`;

    // Set actual size in memory (scaled for retina)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = padWidth * dpr;
    canvas.height = padHeight * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = isInitials ? 2 : 2.5;
    }

    // Handle window resize for responsive canvas
    const handleResize = () => {
      if (!canvas) return;
      canvas.style.width = `${padWidth}px`;
      canvas.style.height = `${padHeight}px`;
      canvas.width = padWidth * dpr;
      canvas.height = padHeight * dpr;
      const resizeCtx = canvas.getContext("2d");
      if (resizeCtx) {
        resizeCtx.scale(dpr, dpr);
        resizeCtx.lineCap = "round";
        resizeCtx.lineJoin = "round";
        resizeCtx.strokeStyle = "#1a1a2e";
        resizeCtx.lineWidth = isInitials ? 2 : 2.5;
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [padWidth, padHeight, isInitials]);

  const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Guard against zero-size rect (Bug 35)
    if (rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 };
    }

    const scaleX = padWidth / rect.width;
    const scaleY = padHeight / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPosition(e);
    lastPointRef.current = pos;
    setIsDrawing(true);

    const ctx = getCtx();
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) {
      e.preventDefault();
    }
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;

    const pos = getPosition(e);
    const last = lastPointRef.current;

    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    lastPointRef.current = pos;
    if (!hasContent) setHasContent(true);
  };

  const stopDrawing = () => {
    if (isDrawing && hasContent) {
      const canvas = canvasRef.current;
      if (canvas) {
        onSignatureChange(canvas.toDataURL("image/png"));
      }
    }
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasContent(false);
    onSignatureChange(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {hasContent && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSignature}
            className="h-6 px-2 text-xs text-gray-400 hover:text-red-500"
          >
            <Eraser className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>
      <div
        className={`relative rounded-lg border-2 ${
          hasContent ? "border-purple-300 bg-white" : "border-dashed border-gray-300 bg-gray-50"
        } transition-colors`}
      >
        <canvas
          ref={canvasRef}
          className="cursor-crosshair touch-none"
          style={{ touchAction: "none" }}
          role="img"
          aria-label={hasContent ? `${label} - signed` : `${label} - awaiting signature`}
          tabIndex={0}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
        {!hasContent && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-gray-400">
              {isInitials ? "Initial here" : "Sign here"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
