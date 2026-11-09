import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Popup shell: drawn straight onto the page body so it always opens in the middle of the screen,
// never trapped inside an animated section. Closes on Escape or a click outside; the page behind stops scrolling.
export default function Modal({ onClose, className = '', style, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = before; };
  }, [onClose]);
  return createPortal(
    <div className="modal-back" onClick={onClose}>
      <div className={`modal ${className}`} style={style} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  );
}
