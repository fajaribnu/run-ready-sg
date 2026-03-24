import { useEffect, useMemo, useRef, useState } from "react";

export default function BottomSheet({
  collapsedVisible = 200,
  expandedRatio = 0.78,
  snapOpenThreshold = 0.6,
  title,
  subtitle,
  children,
  expanded,
  setExpanded,
  onTranslateChange,
}) {
  const sheetRef = useRef(null);

  const expandedHeight = useMemo(
    () => Math.round(window.innerHeight * expandedRatio),
    [expandedRatio]
  );

  const closedTranslate = Math.max(expandedHeight - collapsedVisible, 0);

  const [translateY, setTranslateY] = useState(
    expanded ? 0 : closedTranslate
  );

  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTranslateRef = useRef(expanded ? 0 : closedTranslate);
  const currentTranslateRef = useRef(expanded ? 0 : closedTranslate);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  useEffect(() => {
    const next = expanded ? 0 : closedTranslate;
    currentTranslateRef.current = next;
    setTranslateY(next);
  }, [expanded, closedTranslate]);

  useEffect(() => {
    onTranslateChange?.(translateY, {
      expandedHeight,
      collapsedVisible,
      closedTranslate,
      visibleHeight: expandedHeight - translateY,
    });
  }, [
    translateY,
    expandedHeight,
    collapsedVisible,
    closedTranslate,
    onTranslateChange,
  ]);

  const handlePointerDown = (e) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startTranslateRef.current = currentTranslateRef.current;

    if (sheetRef.current) {
      sheetRef.current.style.transition = "none";
      sheetRef.current.setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;

    e.preventDefault();

    const dy = e.clientY - startYRef.current;
    const next = clamp(startTranslateRef.current + dy, 0, closedTranslate);

    currentTranslateRef.current = next;
    setTranslateY(next);
  };

  const handlePointerUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    sheetRef.current?.releasePointerCapture?.(e.pointerId);

    const progress = closedTranslate === 0
      ? 1
      : 1 - currentTranslateRef.current / closedTranslate;

    const shouldOpen = progress >= snapOpenThreshold;

    if (sheetRef.current) {
      sheetRef.current.style.transition = "transform 0.22s ease";
    }

    const finalY = shouldOpen ? 0 : closedTranslate;
    currentTranslateRef.current = finalY;
    setTranslateY(finalY);
    setExpanded(shouldOpen);
  };

  return (
    <div
      ref={sheetRef}
      className={`bottom-sheet ${expanded ? "expanded" : ""}`}
      style={{
        height: `${expandedHeight}px`,
        transform: `translateY(${translateY}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="sheet-handle-wrap">
        <div className="sheet-handle" />
      </div>

      <div className="sheet-header">
        {title && <h2 className="planner-title">{title}</h2>}
        {subtitle && <p className="planner-subtitle">{subtitle}</p>}
      </div>

      <div
        className="sheet-content"
        style={{ overflowY: expanded ? "auto" : "hidden" }}
      >
        {children}
      </div>
    </div>
  );
}