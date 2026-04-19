import { useState, useRef, useEffect } from "react";
import { COLORS } from "../../theme.js";
import { Icon, Icons } from "./Icon.jsx";

export const Modal = ({ title, onClose, children, width = 420 }) => {
  const [pos, setPos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);

  // Center on first render
  useEffect(() => {
    if (pos.x === null) {
      setPos({
        x: Math.max(20, (window.innerWidth - width) / 2),
        y: Math.max(20, window.innerHeight * 0.15),
      });
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, dragOffset]);

  const onHeaderMouseDown = (e) => {
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
  };

  if (pos.x === null) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}>
      <div ref={modalRef} style={{
        position: "absolute", left: pos.x, top: pos.y, width, pointerEvents: "auto",
        background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12,
        maxHeight: "80vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        <div onMouseDown={onHeaderMouseDown} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`,
          cursor: "grab", userSelect: "none",
        }}>
          <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
            {title}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <Icon d={Icons.x} color={COLORS.textMuted} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
};
