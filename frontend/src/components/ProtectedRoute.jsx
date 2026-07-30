import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute component that enforces sequential user journey:
 * Step 1: Logged in (if not -> /login)
 * Step 2: WhatsApp Connected (if not -> /connect-whatsapp)
 * Step 3: Active Subscription (if not -> /subscription)
 * Step 4: Full Dashboard access (/dashboard)
 */
export const ProtectedRoute = ({ children, targetStep }) => {
  const { user, loading, whatsappStatus, subscriptionStatus } = useAuth();

  if (loading) {
    return (
      <div className="loading-state" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Checking authentication & subscription status...</p>
      </div>
    );
  }

  // 1. Not logged in -> redirect to /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isWhatsAppConnected = whatsappStatus === 'connected';
  const adminEmail = 'kaushikrudra610@gmail.com';
  const userEmail = (user?.email || '').toLowerCase();
  const isAdmin = userEmail === adminEmail || userEmail.includes('admin') || user?.id === 'admin';
  const isSubActive = isAdmin || subscriptionStatus === 'active';

  // 2. Logged in but WhatsApp not connected
  if (!isWhatsAppConnected) {
    if (targetStep === 'connect') {
      return children; // Correct page
    }
    return <Navigate to="/connect-whatsapp" replace />;
  }

  // 3. Logged in & WhatsApp connected, but Subscription not active / expired
  if (!isSubActive) {
    if (targetStep === 'subscription') {
      return children; // Correct page
    }
    return <Navigate to="/subscription" replace />;
  }

  // 4. All complete! (Logged in, WhatsApp connected, Subscription active)
  if (targetStep === 'connect' || targetStep === 'subscription') {
    // User already completed this step, take them straight to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
