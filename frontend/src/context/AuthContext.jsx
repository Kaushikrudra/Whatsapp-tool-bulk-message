import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../supabase';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // WhatsApp status state
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [qr, setQr] = useState(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [planExpiry, setPlanExpiry] = useState(null);

  // Configure Axios authorization header
  const setAuthHeader = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('auth_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('auth_token');
    }
  };

  // Fetch WhatsApp status from backend
  const fetchWhatsAppStatus = useCallback(async () => {
    try {
      setWhatsappLoading(true);
      const res = await axios.get(`${BACKEND_URL}/status`);
      setWhatsappStatus(res.data.status || 'disconnected');
      setQr(res.data.qr || null);
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    } finally {
      setWhatsappLoading(false);
    }
  }, []);

  const fetchUserStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/user/status`);
      if (res.data) {
        const isUserAdmin = res.data.user?.is_admin || res.data.user?.email === 'kaushikrudra610@gmail.com' || res.data.user?.id === 'admin';
        setSubscriptionStatus(isUserAdmin ? 'active' : (res.data.subscription_status || 'inactive'));
        setPlanExpiry(res.data.plan_expiry || null);
        if (res.data.whatsapp_status) {
          setWhatsappStatus(res.data.whatsapp_status);
        }
        if (res.data.qr !== undefined) {
          setQr(res.data.qr);
        }
      }
    } catch (err) {
      console.error('Error fetching user status:', err);
    }
  }, []);

  // Initialize session and auth listeners on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        
        // 1. Check Supabase auth session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setAuthHeader(currentSession.access_token);
          const email = (currentSession.user?.email || '').toLowerCase();
          if (email === 'kaushikrudra610@gmail.com' || email.includes('admin') || currentSession.user?.id === 'admin') {
            setSubscriptionStatus('active');
          }
        } else if (storedToken === 'admin_logged_in') {
          // Handle legacy admin session token
          setSession({ access_token: 'admin_logged_in' });
          setUser({ id: 'admin', email: 'kaushikrudra610@gmail.com' });
          setSubscriptionStatus('active');
          setAuthHeader('admin_logged_in');
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setAuthHeader(newSession.access_token);
        await fetchUserStatus();
      } else {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken !== 'admin_logged_in') {
          setSession(null);
          setUser(null);
          setSubscriptionStatus('inactive');
          setAuthHeader(null);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchUserStatus]);

  // Poll WhatsApp status when logged in
  useEffect(() => {
    if (!user) return;

    fetchWhatsAppStatus();
    fetchUserStatus();

    const interval = setInterval(() => {
      fetchWhatsAppStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [user, fetchWhatsAppStatus, fetchUserStatus]);

  // Sign up with Supabase Email & Password
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      setAuthHeader(data.session.access_token);
      await fetchUserStatus();
    }
    return data;
  };

  // Login with Supabase Email & Password
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      setAuthHeader(data.session.access_token);
      await fetchUserStatus();
    }
    return data;
  };

  // Login with Supabase Email OTP / Magic Link
  const loginWithOtp = async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
    return data;
  };

  // Legacy Admin Login
  const loginLegacyAdmin = async (username, password) => {
    const res = await axios.post(`${BACKEND_URL}/auth/login`, { username, password });
    if (res.data.success) {
      const token = res.data.token || 'admin_logged_in';
      setSession({ access_token: token });
      setUser({ id: 'admin', email: username || 'kaushikrudra610@gmail.com' });
      setSubscriptionStatus('active');
      setAuthHeader(token);
      return res.data;
    }
    throw new Error(res.data.error || 'Login failed');
  };

  // Logout
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signout error:', err);
    }
    try {
      await axios.post(`${BACKEND_URL}/auth/logout`);
    } catch (err) {
      console.error('Backend logout error:', err);
    }
    setSession(null);
    setUser(null);
    setSubscriptionStatus('inactive');
    setAuthHeader(null);
  };

  const value = {
    user,
    session,
    loading,
    whatsappStatus,
    qr,
    whatsappLoading,
    subscriptionStatus,
    planExpiry,
    signUp,
    login,
    loginWithOtp,
    loginLegacyAdmin,
    logout,
    fetchWhatsAppStatus,
    refreshUserStatus: fetchUserStatus,
    setSubscriptionStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
