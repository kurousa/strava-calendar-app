import { useState, useEffect, Component, type ReactNode } from 'react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import { Heart, Activity, Clock, Map, Cloud, LogOut, ChevronRight, Zap } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchDashboardData } from './api/client'
import type { DashboardSummary, GearStatus } from './api/types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-surface-low rounded-[40px] text-on-surface/40 flex flex-col items-center justify-center space-y-2">
          <p className="font-bold italic text-xs">COMPONENT LOAD ERROR</p>
          <p className="text-[10px] uppercase tracking-widest opacity-50">Static bypass activated</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('google_id_token'))
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'dashboard' | 'detail'>('dashboard')

  useEffect(() => {
    if (token) {
      loadData(token)
    }
  }, [token])

  const loadData = async (idToken: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchDashboardData(idToken)
      setData(result)
    } catch (err) {
      setError((err as Error).message)
      if ((err as Error).message.includes('401')) {
        handleLogout()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    googleLogout()
    setToken(null)
    localStorage.removeItem('google_id_token')
    setData(null)
    setView('dashboard')
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-on-surface bg-[#fcfcfc]">
        <div className="max-w-md w-full glass p-10 rounded-2xl shadow-2xl text-center space-y-8 border border-white/40">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-strava">THE KINETIC</h1>
            <p className="text-sm font-medium tracking-widest text-on-surface/60 uppercase">Editorial Dashboard</p>
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  setToken(credentialResponse.credential)
                  localStorage.setItem('google_id_token', credentialResponse.credential)
                }
              }}
              onError={() => console.log('Login Failed')}
              useOneTap
              shape="pill"
              theme="outline"
            />
          </div>
          <p className="text-xs text-on-surface/40">Authorized Strava Access Only</p>
        </div>
      </div>
    )
  }

  const hasHistory = data?.history && data.history.length > 0;

  // Detail View Component
  const ActivityDetail = ({ activity }: { activity: NonNullable<DashboardSummary['lastActivity']> }) => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('dashboard')}
          className="p-3 rounded-2xl bg-surface-low hover:bg-on-surface hover:text-white transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          {/* Hero Section */}
          <div className="bg-strava text-white p-12 md:p-16 rounded-[64px] shadow-2xl space-y-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-16 opacity-10">
               <Zap className="w-64 h-64" />
             </div>
             <div className="space-y-4 relative z-10">
               <p className="text-xs font-black tracking-[0.5em] uppercase opacity-60">{activity.date}</p>
               <h2 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-[0.85] uppercase">
                 {activity.title}
               </h2>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
               <DetailStat label="Distance" value={activity.distance?.toFixed(2)} unit="KM" />
               <DetailStat label="Time" value={activity.duration} unit="MIN" />
               <DetailStat label="Elevation" value={Math.round(activity.elevation || 0)} unit="M" />
               <DetailStat label="Calories" value={activity.calories} unit="KCAL" />
             </div>
          </div>

          {/* AI Comment & Analysis */}
          <div className="bg-white p-12 rounded-[56px] border border-on-surface/5 shadow-xl space-y-8">
            <div className="flex items-center gap-4 text-strava">
              <Cloud className="w-6 h-6" />
              <h4 className="text-xs font-black tracking-widest uppercase">Atmospheric Signal / AI Analysis</h4>
            </div>
            <p className="text-3xl md:text-4xl font-bold tracking-tight leading-tight italic">
              {activity.aiComment || "The performance analysis engine is refining its insights for this session."}
            </p>
            <div className="pt-6 flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/30">
              <span className="px-4 py-2 bg-surface-low rounded-full truncate">Weather: {activity.weather || 'Standard Condition'}</span>
              <span className="px-4 py-2 bg-surface-low rounded-full">Type: {activity.type}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Performance Deep Dive */}
          <div className="bg-on-surface text-white p-10 rounded-[56px] space-y-10">
            <h3 className="text-xs font-black tracking-widest uppercase text-white/40">Performance Metrics</h3>
            <div className="space-y-8">
              <MetricRow icon={<Heart className="w-5 h-5" />} label="Avg Heart Rate" value={activity.avgHr} unit="BPM" />
              <MetricRow icon={<Heart className="w-5 h-5" />} label="Max Heart Rate" value={activity.maxHr} unit="BPM" />
              <MetricRow icon={<Zap className="w-5 h-5" />} label="Avg Power" value={activity.avgWatts} unit="W" />
              <MetricRow icon={<Activity className="w-5 h-5" />} label="Avg Cadence" value={activity.avgCadence} unit="RPM" />
            </div>
          </div>

          <a 
            href={`https://www.strava.com/activities/${activity.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-strava hover:bg-on-surface transition-all duration-500 text-white p-8 rounded-[48px] text-center font-black italic tracking-tighter text-2xl uppercase shadow-xl"
          >
            Open on Strava
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-10 lg:p-16 space-y-12 max-w-7xl mx-auto text-on-surface bg-[#fcfcfc]">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-on-surface/5 pb-8">
        <div className="space-y-1">
          <p className="text-[10px] font-black tracking-[0.4em] text-strava uppercase opacity-80">System Operational</p>
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-[0.85] cursor-pointer" onClick={() => setView('dashboard')}>
            STRAVA <br /> <span className="text-strava">CALENDAR APP</span>
          </h1>
        </div>
        <button 
          onClick={handleLogout}
          className="p-4 rounded-full bg-surface-low hover:bg-on-surface hover:text-white transition-all duration-500 group"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {loading && (
        <div className="animate-pulse space-y-12">
          <div className="h-48 bg-surface-low rounded-[40px]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-surface-low rounded-[40px]" />)}
          </div>
        </div>
      )}

      {error && (
        <div className="p-10 bg-red-50 text-red-600 rounded-[40px] font-medium border border-red-100/50 flex flex-col items-center space-y-4">
          <h3 className="text-xl font-bold italic tracking-tighter uppercase">Signal Lost</h3>
          <p className="text-sm opacity-70">{error}</p>
          <button onClick={() => token && loadData(token)} className="px-6 py-2 bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-widest">Reconnect</button>
        </div>
      )}

      {data && (
        <main>
          {view === 'dashboard' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start animate-in fade-in duration-700">
              {/* Left Column */}
              <div className="lg:col-span-8 space-y-12">
                {/* Fitness Chart */}
                <div className="bg-white/60 backdrop-blur-xl rounded-[40px] p-8 md:p-10 space-y-10 border border-white/20 shadow-2xl relative overflow-hidden group">
                  <div className="flex justify-between items-baseline relative z-10">
                    <div className="space-y-1">
                      <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Fitness</h2>
                      <p className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase">30-Day Evolution Chart</p>
                    </div>
                    <div className="text-right">
                      <span className="text-5xl font-black italic text-strava tracking-tighter">{data.fitness || 0}</span>
                      <p className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase">TSS Cumulative</p>
                    </div>
                  </div>

                  <div className="h-[200px] w-full mt-4">
                    <ErrorBoundary>
                      {hasHistory ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data.history}>
                            <defs>
                              <linearGradient id="colorTss" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#fc6100" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#fc6100" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={[0, 'auto']} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                borderRadius: '24px', 
                                border: 'none',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                                backdropFilter: 'blur(12px)',
                                padding: '12px 16px'
                              }}
                              itemStyle={{ color: '#fc6100', fontWeight: '900', fontSize: '12px' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#fc6100" 
                              strokeWidth={4}
                              fillOpacity={1} 
                              fill="url(#colorTss)" 
                              animationDuration={1500}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-on-surface/5 rounded-[32px]">
                          <p className="text-[10px] font-bold tracking-widest text-on-surface/20 uppercase italic">Aggregation pending activity data</p>
                        </div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>

                {/* Recent Activity Card */}
                <ErrorBoundary>
                  {data.lastActivity && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div 
                        onClick={() => setView('detail')}
                        className="bg-strava text-white p-10 rounded-[48px] flex flex-col justify-between aspect-square shadow-[0_30px_60px_-15px_rgba(252,97,0,0.3)] group overflow-hidden relative cursor-pointer hover:scale-[1.02] transition-all duration-500"
                      >
                        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                          <Zap className="w-48 h-48" />
                        </div>
                        <div className="space-y-6 relative z-10">
                          <div className="bg-white/20 w-fit p-4 rounded-2xl backdrop-blur-md">
                            <Activity className="w-8 h-8" />
                          </div>
                          <h3 className="text-4xl font-black italic tracking-tighter leading-[0.9] uppercase">
                            {data.lastActivity.title || "Elite Performance"}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                          <div>
                            <p className="text-[10px] font-black tracking-widest text-white/50 uppercase">Distance</p>
                            <p className="text-3xl font-black italic tracking-tighter">{(data.lastActivity.distance || 0).toFixed(1)}<span className="text-xs ml-1 opacity-50">KM</span></p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black tracking-widest text-white/50 uppercase">Elev Gain</p>
                            <p className="text-3xl font-black italic tracking-tighter">{Math.round(data.lastActivity.elevation || 0)}<span className="text-xs ml-1 opacity-50">M</span></p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-10 rounded-[48px] flex flex-col justify-between border border-on-surface/5 shadow-xl">
                        <div className="space-y-8">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-surface-low rounded-xl">
                              <Cloud className="w-4 h-4 text-on-surface/40" />
                            </div>
                            <span className="text-xs font-black tracking-widest uppercase text-on-surface/40">{data.lastActivity.weather || 'Analyzing Atmosphere'}</span>
                          </div>
                          <p className="text-xl font-bold leading-snug text-on-surface tracking-tight">
                            {data.lastActivity.aiComment ? `"${data.lastActivity.aiComment}"` : "Our AI engine is processing your performance metrics to deliver custom athletic insights."}
                          </p>
                        </div>
                        <div 
                          onClick={() => setView('detail')}
                          className="flex items-center gap-2 group cursor-pointer w-fit"
                        >
                          <span className="text-[10px] font-black tracking-widest uppercase opacity-40 group-hover:opacity-100 transition-opacity">Extended Analytics</span>
                          <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  )}
                </ErrorBoundary>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 space-y-12">
                <div className="space-y-6">
                  <h2 className="text-[10px] font-black tracking-[0.4em] text-on-surface/30 uppercase px-4 inline-flex items-center gap-2">
                    <span className="w-2 h-2 bg-strava rounded-full animate-pulse" /> Asset Tracking
                  </h2>
                  <div className="space-y-4">
                    <ErrorBoundary>
                      {data.gears.map((gear, idx) => (
                        <GearItem key={idx} gear={gear} />
                      ))}
                    </ErrorBoundary>
                  </div>
                </div>

                {/* Right Column Meta Stats */}
                <div className="bg-on-surface text-white p-10 rounded-[48px] space-y-10 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                     <Clock className="w-32 h-32" />
                   </div>
                   <MetaStat icon={<Heart className="w-8 h-8 text-strava" />} label="Target Heart Rate" value="142" unit="BPM" />
                   <MetaStat icon={<Zap className="w-8 h-8 text-strava" />} label="Weekly Volume" value="12.4" unit="HRS" />
                </div>
              </div>
            </div>
          ) : (
            data.lastActivity && <ActivityDetail activity={data.lastActivity} />
          )}
        </main>
      )}
    </div>
  )
}

// Helper Components
function DetailStat({ label, value, unit }: { label: string, value: string | number | undefined, unit: string }) {
  return (
    <div>
      <p className="text-[10px] font-black tracking-widest text-white/50 uppercase">{label}</p>
      <p className="text-3xl font-black italic tracking-tighter">{value || '-'}<span className="text-xs ml-1 opacity-50">{unit}</span></p>
    </div>
  )
}

function MetricRow({ icon, label, value, unit }: { icon: ReactNode, label: string, value: string | number | undefined, unit: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-4">
      <div className="flex items-center gap-4">
        <div className="text-strava">{icon}</div>
        <span className="text-[10px] font-black tracking-widest uppercase opacity-60">{label}</span>
      </div>
      <p className="text-xl font-black italic tracking-tighter uppercase">{value || 'N/A'}<span className="text-[10px] ml-1 opacity-40 not-italic">{unit}</span></p>
    </div>
  )
}

function MetaStat({ icon, label, value, unit }: { icon: ReactNode, label: string, value: string, unit: string }) {
  return (
    <div className="flex items-center gap-5 relative z-10">
       <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
         {icon}
       </div>
       <div>
         <p className="text-[10px] font-black text-white/30 tracking-widest uppercase">{label}</p>
         <p className="text-3xl font-black italic tracking-tighter uppercase">{value} <span className="text-xs opacity-40 not-italic">{unit}</span></p>
       </div>
    </div>
  )
}

function GearItem({ gear }: { gear: GearStatus }) {
  return (
    <div className="bg-white p-6 rounded-[32px] shadow-lg hover:shadow-xl transition-all duration-300 border border-on-surface/5 flex gap-5 items-center group">
      <div className="bg-surface-low p-4 rounded-2xl group-hover:bg-on-surface group-hover:text-white transition-colors duration-500">
        {gear.type === 'Bike' ? <Activity className="w-5 h-5" /> : <Map className="w-5 h-5" />}
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-black tracking-tight truncate max-w-[150px] uppercase">{gear.name}</h4>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase",
            gear.thresholdKm && (gear.distanceKm || 0) > gear.thresholdKm * 0.8 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
          )}>
            In Use
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="w-full bg-surface-low h-1.5 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-1000",
                gear.thresholdKm && (gear.distanceKm || 0) > gear.thresholdKm * 0.8 ? "bg-red-500" : "bg-strava"
              )}
              style={{ width: `${Math.min(((gear.distanceKm || 0) / (gear.thresholdKm || 5000)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-black tracking-[0.2em] text-on-surface/30 uppercase">
            <span>{Math.round(gear.distanceKm || 0)} KM</span>
            <span>{gear.thresholdKm || 5000} KM LIMIT</span>
          </div>
        </div>
      </div>
    </div>
  )
}
