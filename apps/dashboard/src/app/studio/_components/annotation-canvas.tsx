"use client";

import { useRef, useState } from "react";

type AnnotationCanvasProps = {
  src: string;
  alt?: string;
  readOnly?: boolean;
  mode: "box" | "point";
  boxes: number[][];
  points: number[][];
  onBoxAdded?: (box: number[]) => void;
  onPointAdded?: (point: number[]) => void;
  masks?: { key: string; url: string }[];
};

export function AnnotationCanvas({
  src,
  alt = "Preview",
  readOnly = false,
  mode,
  boxes,
  points,
  onBoxAdded,
  onPointAdded,
  masks,
}: AnnotationCanvasProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<number[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  function getCoords(e: React.MouseEvent<HTMLDivElement>): [number, number] | null {
    if (!imgRef.current || !dims) return null;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = dims.w / rect.width;
    const scaleY = dims.h / rect.height;
    return [
      Math.max(0, Math.min(Math.round((e.clientX - rect.left) * scaleX), dims.w)),
      Math.max(0, Math.min(Math.round((e.clientY - rect.top) * scaleY), dims.h)),
    ];
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const coords = getCoords(e);
    if (!coords) return;

    if (mode === "point") {
      onPointAdded?.(coords);
      return;
    }

    setIsDrawing(true);
    setCurrentBox([coords[0], coords[1], coords[0], coords[1]]);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "box" || !isDrawing || !currentBox) return;
    const coords = getCoords(e);
    if (!coords) return;
    setCurrentBox([currentBox[0], currentBox[1], coords[0], coords[1]]);
  }

  function handleMouseUp() {
    if (mode !== "box" || !isDrawing || !currentBox) return;
    setIsDrawing(false);
    const x1 = Math.min(currentBox[0], currentBox[2]);
    const y1 = Math.min(currentBox[1], currentBox[3]);
    const x2 = Math.max(currentBox[0], currentBox[2]);
    const y2 = Math.max(currentBox[1], currentBox[3]);
    if (x2 - x1 > 5 && y2 - y1 > 5) {
      onBoxAdded?.([x1, y1, x2, y2]);
    }
    setCurrentBox(null);
  }

  function renderBox(box: number[], key: string, isDraft = false) {
    if (!dims) return null;
    const x1 = Math.min(box[0], box[2]);
    const y1 = Math.min(box[1], box[3]);
    const x2 = Math.max(box[0], box[2]);
    const y2 = Math.max(box[1], box[3]);
    return (
      <div
        key={key}
        className={`absolute border-2 pointer-events-none ${isDraft ? "border-primary border-dashed bg-primary/10" : "border-emerald-500 bg-emerald-500/20"}`}
        style={{
          left: `${(x1 / dims.w) * 100}%`,
          top: `${(y1 / dims.h) * 100}%`,
          width: `${((x2 - x1) / dims.w) * 100}%`,
          height: `${((y2 - y1) / dims.h) * 100}%`,
        }}
      />
    );
  }

  function renderPoint(pt: number[], key: string) {
    if (!dims) return null;
    return (
      <div
        key={key}
        className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 shadow-sm pointer-events-none"
        style={{
          left: `${(pt[0] / dims.w) * 100}%`,
          top: `${(pt[1] / dims.h) * 100}%`,
        }}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-border/60 select-none ${!readOnly ? "cursor-crosshair" : ""}`}
      onMouseDown={!readOnly ? handleMouseDown : undefined}
      onMouseMove={!readOnly ? handleMouseMove : undefined}
      onMouseUp={!readOnly ? handleMouseUp : undefined}
      onMouseLeave={!readOnly ? handleMouseUp : undefined}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="h-auto w-full pointer-events-none"
        draggable={false}
        onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      />

      {masks?.map((mask, index) => (
        <img
          key={`${mask.key}-${index}`}
          src={mask.url}
          alt={`Mask ${index + 1}`}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-65"
        />
      ))}

      {!readOnly && boxes.map((box, index) => renderBox(box, `box-${index}`))}
      {!readOnly && currentBox && renderBox(currentBox, "current-box", true)}
      {!readOnly && points.map((pt, index) => renderPoint(pt, `point-${index}`))}
    </div>
  );
}
