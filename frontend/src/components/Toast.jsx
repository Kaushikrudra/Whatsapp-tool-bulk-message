import React from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export function Toast({ message, type, onClose }) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="toast-icon text-success" size={20} />;
      case 'error':
        return <AlertTriangle className="toast-icon text-error" size={20} />;
      case 'warning':
        return <AlertTriangle className="toast-icon text-warning" size={20} />;
      case 'info':
      default:
        return <Info className="toast-icon text-info" size={20} />;
    }
  };

  return (
    <div className={`toast-item toast-${type}`}>
      {getIcon()}
      <span className="toast-message">{message}</span>
      <button className="toast-close-btn" onClick={onClose} aria-label="Close notification">
        <X size={14} />
      </button>
      <div className="toast-progress-bar"></div>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
