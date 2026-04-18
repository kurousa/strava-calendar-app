import { useState, useEffect, Component, type ReactNode } from 'react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import { Heart, Activity, Clock, Map, Cloud, LogOut, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchDashboardData } from './api/client'
import type { DashboardSummary } from './api/types'
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
          <p className="font-bold italic">COMPONENT ERROR</p>
          <p className="text-[10px] uppercase tracking-widest">The kinetic failed to render this block</p>
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
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-on-surface">
        <div className="max-w-md w-full glass p-10 rounded-2xl shadow-2xl text-center space-y-8">
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
              onError={() => {
                console.log('Login Failed')
              }}
              useOneTap
              shape="pill"
              theme="outline"
            />
          </div>
          <p className="text-xs text-on-surface/40">
            Secure access to your Strava fitness metrics and gear status.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12 space-y-12 max-w-7xl mx-auto text-on-surface">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-xs font-bold tracking-[0.3em] text-strava uppercase">Daily Report</p>
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-none">
            STRAVA <br /> <span className="text-strava">CALENDAR APP</span>
          </h1>
        </div>
        <button 
          onClick={handleLogout}
          className="p-3 rounded-full hover:bg-surface-low transition-colors group"
        >
          <LogOut className="w-6 h-6 text-on-surface/40 group-hover:text-strava" />
        </button>
      </header>

      {loading && (
        <div className="animate-pulse space-y-8">
          <div className="h-64 bg-surface-low rounded-[40px]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-48 bg-surface-low rounded-[40px]" />
            <div className="h-48 bg-surface-low rounded-[40px]" />
          </div>
        </div>
      )}

      {error && (
        <div className="p-8 bg-red-50 text-red-600 rounded-[40px] font-medium border border-red-100">
          <h3 className="text-lg font-bold mb-2">Connection Error</h3>
          <p>{error}</p>
          <button 
            onClick={() => token && loadData(token)}
            className="mt-4 text-sm font-bold underline"
          >
            Retry Fetching Data
          </button>
        </div>
      )}

      {data && (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Metrics & History */}
          <div className="lg:col-span-8 space-y-8">
            {/* TSS Chart */}
            <div className="bg-white/40 backdrop-blur-xl rounded-[40px] p-8 space-y-8 border border-white/20 shadow-xl">
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <h2 className="text-3xl font-black italic tracking-tighter">Fitness Evolution</h2>
                  <p className="text-sm text-on-surface/50">Cumulative TSS over the last 30 days</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-strava">{data.fitness || 0}</span>
                  <p className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase">Current Score</p>
                </div>
              </div>

              <div className="h-[300px] w-full mt-8">
                <ErrorBoundary>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.history}>
                      <defs>
                        <linearGradient id="colorTss" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fc6100" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#fc6100" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000005" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={[0, 'auto']} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                          borderRadius: '20px', 
                          border: 'none',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                          backdropFilter: 'blur(10px)'
                        }}
                        itemStyle={{ color: '#fc6100', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#fc6100" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorTss)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ErrorBoundary>
              </div>
            </div>

            {/* Recent Activity */}
            <ErrorBoundary>
              {data.lastActivity && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-strava text-white p-8 rounded-[40px] flex flex-col justify-between aspect-square">
                    <div className="space-y-4">
                      <div className="bg-white/20 w-fit p-3 rounded-2xl">
                        <Activity className="w-8 h-8" />
                      </div>
                      <h3 className="text-3xl font-black leading-tight">
                        {data.lastActivity.title}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Distance</p>
                        <p className="text-2xl font-bold">{(data.lastActivity.distance || 0).toFixed(1)}km</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Elevation</p>
                        <p className="text-2xl font-bold">{data.lastActivity.elevation || 0}m</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-surface-low p-8 rounded-[40px] flex flex-col justify-between border border-surface-low">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <Cloud className="w-5 h-5 text-on-surface/40" />
                        <span className="text-sm font-bold tracking-tighter">{data.lastActivity.weather || 'Sunny'}</span>
                      </div>
                      <p className="text-lg font-medium leading-relaxed text-on-surface/80">
                        "{data.lastActivity.aiComment || 'Great session! Consistency is key to long-term performance wins.'}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2 group cursor-pointer w-fit">
                      <span className="text-[10px] font-bold tracking-widest uppercase">View Details</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              )}
            </ErrorBoundary>
          </div>

          {/* Right Column: Gear & Stats */}
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <h2 className="text-xs font-bold tracking-[0.3em] text-on-surface/40 uppercase">Arsenal Status</h2>
              </div>
              
              <div className="space-y-4">
                <ErrorBoundary>
                  {data.gears.map((gear, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[32px] shadow-sm hover:shadow-md transition-shadow border border-surface-low flex gap-4 items-center">
                      <div className="bg-surface-low p-3 rounded-2xl">
                        {gear.type === 'Bike' ? <Activity className="w-5 h-5" /> : <Map className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold tracking-tight truncate max-w-[150px]">{gear.name}</h4>
                          <ChevronRight className="w-3 h-3 text-on-surface/20" />
                        </div>
                        <div className="space-y-1">
                          <div className="w-full bg-surface-low h-2 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-1000",
                                gear.thresholdKm && (gear.distanceKm || 0) > gear.thresholdKm * 0.8 ? "bg-strava" : "bg-primary-custom"
                              )}
                              style={{ width: `${Math.min(((gear.distanceKm || 0) / (gear.thresholdKm || 5000)) * 100, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-bold tracking-widest text-on-surface/40 uppercase">
                            <span>{Math.round(gear.distanceKm || 0)}km</span>
                            <span>{gear.thresholdKm || 5000}km</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </ErrorBoundary>
              </div>
            </div>

            {/* Meta Stats Panel */}
            <div className="bg-on-surface text-white p-8 rounded-[40px] space-y-8 shadow-2xl">
              <div className="flex items-center gap-4">
                 <div className="bg-white/10 p-3 rounded-2xl">
                   <Heart className="w-8 h-8 text-strava" />
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Avg Heart Rate</p>
                   <p className="text-2xl font-bold tracking-tight">142 bpm</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="bg-white/10 p-3 rounded-2xl">
                   <Clock className="w-8 h-8 text-strava" />
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Weekly Volume</p>
                   <p className="text-2xl font-bold tracking-tight">12.4 hrs</p>
                 </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
