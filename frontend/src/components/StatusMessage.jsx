import React, { useEffect } from "react";

export default function StatusMessage({ message, show, duration = 3000, onClose }) {

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  return (
    <div
      className={`
        z-[10] fixed left-1/2 transform -translate-x-1/2
        bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg
        transition-all duration-500
        ${show ? "bottom-6 opacity-100" : "-bottom-16 opacity-0"}
      `}
    >
      {message}
    </div>
  );
}