// The bold red medical cross on a white tile, the mark every injury graphic carries.
import React from 'react';

export default function MedicalCross({ className = '' }) {
  return (
    <svg className={`med-cross ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="4.5" fill="#fff" />
      <path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z" fill="#e01b24" />
    </svg>
  );
}
