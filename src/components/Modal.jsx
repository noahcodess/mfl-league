import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Popup shell: drawn straight onto the page body so it always opens in the middle of the screen,
// never trapped inside an animated section. Closes on Escape or a click outside; the page behind stops scrolling.
export default function Modal({ onClose, className = '', style, children }) {
  const back = useRef(null);
  useEffect(() => {
    const top = () => { const all = document.querySelectorAll('.modal-back'); return all[all.length - 1] === back.current; };
    const onKey = (e) => e.key === 'Escape' && top() && onClose?.();
    window.addEventListener('keydown', onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = before; };
  }, [onClose]);
  return createPortal(
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className={`modal ${className}`} style={style} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  );
}
