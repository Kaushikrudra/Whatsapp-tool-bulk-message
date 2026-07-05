import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { 
  TrendingUp, Calendar, Award, 
  ShieldAlert, CheckCircle, Activity, Info 
} from 'lucide-react';

const BACKEND_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/analytics`;

function AnalyticsDashboard() {
  const [range, setRange] = useState('7d');
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [bestTime, setBestTime] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [wowTrends, setWowTrends] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all analytics datasets
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, timelineRes, bestTimeRes, comparisonRes, wowRes, segmentsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/summary`),
        axios.get(`${BACKEND_URL}/delivery-timeline?range=${range}`),
        axios.get(`${BACKEND_URL}/best-time`),
        axios.get(`${BACKEND_URL}/comparison`),
        axios.get(`${BACKEND_URL}/wow-trends`),
        axios.get(`${BACKEND_URL}/segments`)
      ]);

      setSummary(summaryRes.data);
      setTimeline(timelineRes.data);
      setBestTime(bestTimeRes.data);
      setComparison(comparisonRes.data);
      setWowTrends(wowRes.data);
      setSegments(segmentsRes.data);
    } catch (err) {
      console.error('Error fetching analytics dashboard:', err);
      setError('Failed to fetch analytics metrics. Please ensure database and Redis services are active.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  // Re-fetch timeline when range changes
  const fetchTimelineOnly = useCallback(async () => {
    try {
      const timelineRes = await axios.get(`${BACKEND_URL}/delivery-timeline?range=${range}`);
      setTimeline(timelineRes.data);
    } catch (err) {
      console.error('Error fetching delivery timeline:', err);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    // Skip if loading is complete or just range updates
    fetchTimelineOnly();
  }, [range, fetchTimelineOnly]);

  // Format hour (0-23) to 12-hour format (e.g. 10:00 AM)
  const formatHourLabel = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:00 ${ampm}`;
  };

  // Get ranked best sending hours based on success rate (only counting hours with >= 10 messages)
  const getRankedBestTimes = () => {
    return [...bestTime]
      .filter(item => item.sample_size >= 10)
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, 5); // Return top 5
  };

  // Get ranked hours with insufficient data (< 10 messages)
  const getInsufficientDataTimes = () => {
    return [...bestTime]
      .filter(item => item.sample_size > 0 && item.sample_size < 10);
  };

  if (loading && !summary) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Generating Advanced Analytics Reports...</p>
      </div>
    );
  }

  const successRate = summary && summary.total_processed > 0
    ? ((summary.total_sent / summary.total_processed) * 100).toFixed(1)
    : '0.0';

  const failureRate = summary && summary.total_processed > 0
    ? ((summary.total_failed / summary.total_processed) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="analytics-dashboard-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HEADER SECTION */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Advanced Analytics Dashboard</h2>
          <p className="subtitle" style={{ margin: '4px 0 0 0' }}>Real-time transmission volumes, delivery efficiency, and campaign comparisons</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchAnalytics} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={15} />
          Refresh Stats
        </button>
      </header>

      {error && <div className="alert alert-error" style={{ textAlign: 'left' }}>{error}</div>}

      {/* SUMMARY STATS GRID */}
      {summary && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Calendar size={24} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>Total Campaigns</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700' }}>{summary.total_campaigns}</h3>
            </div>
          </div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent-teal)' }}>
              <CheckCircle size={24} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>Successful Deliveries</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700' }}>{summary.total_sent}</h3>
              <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: '600' }}>{successRate}% rate</span>
            </div>
          </div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <ShieldAlert size={24} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>Failed Deliveries</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700' }}>{summary.total_failed}</h3>
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{failureRate}% rate</span>
            </div>
          </div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
              <Activity size={24} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>Total Processed</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700' }}>{summary.total_processed}</h3>
            </div>
          </div>
        </div>
      )}

      {/* WEEK-OVER-WEEK TRENDS WIDGET */}
      {wowTrends && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '16px 20px', borderRadius: '12px', 
          background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp className="text-teal" size={20} />
            <div>
              <strong style={{ fontSize: '14.5px', color: 'var(--text-primary)' }}>Week-over-Week Insights</strong>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Comparing past 7 days against the previous week.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Volume Change:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '15px' }}>{wowTrends.current_week_volume} vs {wowTrends.prev_week_volume}</strong>
                <span className={`status-pill ${wowTrends.volume_growth_percentage >= 0 ? 'active' : 'inactive'}`} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>
                  {wowTrends.volume_growth_percentage >= 0 ? '+' : ''}{wowTrends.volume_growth_percentage}%
                </span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Success Rate Variance:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '15px' }}>{wowTrends.current_week_success_rate}% vs {wowTrends.prev_week_success_rate}%</strong>
                <span className={`status-pill ${wowTrends.success_rate_variance >= 0 ? 'active' : 'inactive'}`} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>
                  {wowTrends.success_rate_variance >= 0 ? '+' : ''}{wowTrends.success_rate_variance}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHARTS CONTAINER GRID */}
      <div className="analytics-charts-grid">
        
        {/* LEFT CHART: Delivery Timeline */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', minHeight: '380px' }}>
          <header className="card-header border-none pb-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 16px 0' }}>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: '700' }}>Delivery Rate Timeline</h3>
              <p className="subtitle" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>Aggregated daily volume trends</p>
            </div>
            
            {/* Range Presets Selector */}
            <div className="range-presets" style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '3px', borderRadius: '6px' }}>
              {[['7d', '7 Days'], ['30d', '30 Days'], ['all', 'All Time']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRange(val)}
                  style={{
                    border: 'none',
                    background: range === val ? 'var(--bg-card)' : 'transparent',
                    color: range === val ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: range === val ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>
          
          <div style={{ flex: 1, width: '100%', minHeight: '260px' }}>
            {timeline.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No message data found for this range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="100">
                      <stop offset="5%" stopColor="var(--accent-teal)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="var(--accent-teal)" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="100">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border-color)" />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border-color)" />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}
                    labelStyle={{ fontWeight: '600', color: 'var(--text-primary)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" name="Success" dataKey="successful" stroke="var(--accent-teal)" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2} />
                  <Area type="monotone" name="Failed" dataKey="failed" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Best Time to Send Analysis */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', minHeight: '380px' }}>
          <header className="card-header border-none pb-0" style={{ padding: '0 0 16px 0', textAlign: 'left' }}>
            <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: '700' }}>Best Time to Send</h3>
            <p className="subtitle" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>Success rate grouped by hourly window</p>
          </header>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {bestTime.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No transmission data found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Top Recommended Times (>=10 messages) */}
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                    <Award size={14} /> Recommended slots
                  </span>
                  
                  {getRankedBestTimes().length === 0 ? (
                    <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', paddingLeft: '4px' }}>
                      Collect at least 10 sends in an hourly block to see recommendations.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {getRankedBestTimes().map((item, idx) => (
                        <div key={item.hour} style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 12px', borderRadius: '6px', background: idx === 0 ? 'rgba(20, 184, 166, 0.05)' : 'var(--bg-primary)',
                          border: idx === 0 ? '1px solid rgba(20, 184, 166, 0.15)' : '1px solid transparent'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: idx === 0 ? 'var(--accent-teal)' : 'var(--text-primary)' }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {formatHourLabel(item.hour)}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.success_rate}%</span>
                            <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>({item.sample_size} sent)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Insufficient Data Info Block */}
                {getInsufficientDataTimes().length > 0 && (
                  <div style={{ 
                    marginTop: '12px', padding: '10px 12px', borderRadius: '6px', 
                    background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--border-color)', textAlign: 'left'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                      <Info size={13} /> Small Sample Sizes
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {getInsufficientDataTimes().map(item => (
                        <span key={item.hour} style={{ fontSize: '10.5px', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          {formatHourLabel(item.hour)}: {item.success_rate}% <span style={{ opacity: 0.6 }}>({item.sample_size})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
              </div>
            )}
          </div>
        </div>

      </div>

      {/* CAMPAIGN COMPARISON LIST CARD */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <header className="card-header border-none pb-0" style={{ padding: '0 0 16px 0', textAlign: 'left' }}>
          <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: '700' }}>Campaign Metrics Comparison</h3>
          <p className="subtitle" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>Performance metrics comparison across campaigns</p>
        </header>

        <div style={{ overflowX: 'auto' }}>
          {comparison.length === 0 ? (
            <p className="empty-message" style={{ margin: '20px 0' }}>No campaigns found. Create your first campaign to generate insights!</p>
          ) : (
            <table className="contacts-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Campaign Name</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Total Queue</th>
                  <th style={{ padding: '12px 16px' }}>Sent</th>
                  <th style={{ padding: '12px 16px' }}>Failed</th>
                  <th style={{ padding: '12px 16px' }}>Success Rate</th>
                  <th style={{ padding: '12px 16px' }}>Launch Date</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-pill ${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{item.total_contacts}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--accent-teal)', fontWeight: '600' }}>{item.successful}</td>
                    <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: '600' }}>{item.failed}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', color: item.success_rate >= 80 ? 'var(--accent-teal)' : item.success_rate >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {item.success_rate}%
                        </span>
                        
                        {/* Custom progress mini-bar */}
                        <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${item.success_rate}%`, height: '100%', 
                            background: item.success_rate >= 80 ? 'var(--accent-teal)' : item.success_rate >= 50 ? '#f59e0b' : '#ef4444' 
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SEGMENT PERFORMANCE ANALYTICS CARD */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', marginTop: '24px' }}>
        <header className="card-header border-none pb-0" style={{ padding: '0 0 16px 0', textAlign: 'left' }}>
          <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: '700' }}>Segment Performance Breakdown</h3>
          <p className="subtitle" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>Transmission volumes and success rates grouped by contact tags</p>
        </header>

        <div style={{ overflowX: 'auto' }}>
          {segments.length === 0 ? (
            <p className="empty-message" style={{ margin: '20px 0' }}>No tag segments found. Apply tags to contacts and send messages to build segment insights.</p>
          ) : (
            <table className="contacts-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Segment Tag</th>
                  <th style={{ padding: '12px 16px' }}>Total Sent</th>
                  <th style={{ padding: '12px 16px' }}>Successful</th>
                  <th style={{ padding: '12px 16px' }}>Failed</th>
                  <th style={{ padding: '12px 16px' }}>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {segments.map(item => (
                  <tr key={item.tag} style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                      <span className="status-pill active" style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '4px' }}>
                        {item.tag}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{item.total_sent}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--accent-teal)', fontWeight: '600' }}>{item.successful}</td>
                    <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: '600' }}>{item.failed}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', color: item.success_rate >= 80 ? 'var(--accent-teal)' : item.success_rate >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {item.success_rate}%
                        </span>
                        {/* Custom progress mini-bar */}
                        <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${item.success_rate}%`, height: '100%', 
                            background: item.success_rate >= 80 ? 'var(--accent-teal)' : item.success_rate >= 50 ? '#f59e0b' : '#ef4444' 
                          }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}

export default AnalyticsDashboard;
