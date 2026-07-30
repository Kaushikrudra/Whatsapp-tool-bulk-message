import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { CheckCircle2, ShieldCheck, Zap, CreditCard, ArrowRight, AlertCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const SubscriptionPage = () => {
  const { user, refreshUserStatus, logout, setSubscriptionStatus } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handlePayment = async () => {
    setError('');
    setLoading(true);

    try {
      // 1. Fetch public Razorpay key if needed or call order creation API
      const orderRes = await axios.post(`${BACKEND_URL}/subscription/create-order`);
      const { order_id, amount, currency, key_id } = orderRes.data;

      const razorpayKey = key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_key';

      // 2. Configure Razorpay checkout options
      const options = {
        key: razorpayKey,
        amount: amount,
        currency: currency,
        name: 'BulkChat WhatsApp Tool',
        description: 'Pro Subscription - 30 Days Access',
        image: 'https://cdn-icons-png.flaticon.com/512/3670/3670051.png',
        order_id: order_id,
        prefill: {
          email: user?.email || '',
        },
        theme: {
          color: '#10b981',
        },
        handler: async function (response) {
          try {
            setLoading(true);
            // 3. Send payment details to backend for signature verification
            const verifyRes = await axios.post(`${BACKEND_URL}/subscription/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              setSubscriptionStatus('active');
              await refreshUserStatus();
              // 4. Redirect to Dashboard
              navigate('/dashboard', { replace: true });
            } else {
              setError(verifyRes.data.error || 'Payment verification failed.');
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            setError(err.response?.data?.error || 'Failed to verify payment with server.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please refresh the page and try again.');
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Payment setup error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to initiate payment.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper" style={{ padding: '24px' }}>
      <div className="subscription-card card" style={{ maxWidth: '480px', width: '100%' }}>
        <header className="card-header border-none pb-0" style={{ textAlign: 'center' }}>
          <div className="step-indicator-bar" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ padding: '4px 12px', borderRadius: '12px', background: 'var(--accent-orange-glow)', color: 'var(--accent-orange)', fontSize: '12px', fontWeight: '700' }}>
              Step 3 of 3: Activate Subscription
            </span>
          </div>
          <div className="subscription-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-teal)', fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
            <Zap size={16} /> UNLOCK PRO ACCESS
          </div>
          <h1>Pro Plan Subscription</h1>
          <p className="subtitle">Activate your 30-day Pro access to start sending bulk WhatsApp broadcasts.</p>
        </header>

        <main className="card-body">
          {error && (
            <div className="alert alert-error mb-20" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Pro Plan Card */}
          <div className="pro-plan-box">
            <div className="pricing-popular-badge">RECOMMENDED</div>

            <div className="plan-header">
              <h3 className="plan-title">Pro Subscription</h3>
              <p className="plan-subtitle">Complete WhatsApp Automation Suite</p>
            </div>

            <div className="plan-price">
              <span className="currency">₹</span>
              <span className="amount">2,999</span>
              <span className="period">/ 30 days</span>
            </div>

            <ul className="plan-features-list">
              <li>
                <CheckCircle2 size={18} className="icon-check" /> <span><strong>Unlimited</strong> WhatsApp Bulk Messages</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="icon-check" /> <span><strong>AI Auto-Reply</strong> & Keyword Chatbot</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="icon-check" /> <span>Multi-List Contact Upload & Tagging</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="icon-check" /> <span>Live 2-Way Chat Inbox</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="icon-check" /> <span>High-Speed Bull/Redis Queue Engine</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="icon-check" /> <span>Analytics & Campaign System Logs</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading}
            className="btn btn-primary mt-24"
            style={{ 
              width: '100%', 
              padding: '14px 24px', 
              fontSize: '16px', 
              fontWeight: '700',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}
          >
            {loading ? (
              'Processing Payment...'
            ) : (
              <>
                <CreditCard size={18} /> Pay ₹2,999 & Continue <ArrowRight size={18} />
              </>
            )}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="var(--accent-teal)" /> Secured by 256-bit Razorpay Encryption
          </div>
        </main>

        <footer className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={logout} className="btn-pagination" style={{ fontSize: '13px', color: 'var(--accent-red)' }}>
            Sign Out
          </button>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>BulkChat Billing Engine</p>
        </footer>
      </div>
    </div>
  );
};

export default SubscriptionPage;
