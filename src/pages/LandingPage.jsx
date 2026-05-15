import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export default function LandingPage() {
  const { user, signInWithGoogle, loading } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/dashboard')
  }, [user, loading])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--accent)' }}>T</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 18 }}>Teamer</span>
        </div>
        <button className="btn-ghost p-2" onClick={toggle}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xl mx-auto animate-fade-in">
          {/* Office icon cluster */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {['fi-br-laptop', 'fi-br-paint-brush', 'fi-br-megaphone', 'fi-br-flask', 'fi-br-chart-histogram'].map((icon, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', transform: `rotate(${(i - 2) * 4}deg)` }}
              >
                <i className={`fi ${icon}`} style={{ fontSize: 18, color: 'var(--accent)' }} />
              </div>
            ))}
          </div>

          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1, color: 'var(--text)' }}>
            Your remote team's<br />
            <span style={{ color: 'var(--accent)' }}>digital office.</span>
          </h1>

          <p className="mt-4 mb-8 text-base leading-relaxed max-w-md mx-auto" style={{ color: 'var(--text-2)' }}>
            Assign role-aware tasks, review design files, approve pull requests, and keep your whole team in sync — all in one workspace.
          </p>

          <button
            className="btn-primary px-6 py-3 text-base mx-auto"
            onClick={signInWithGoogle}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left">
            {[
              { icon: 'fi-br-target', title: 'Role-aware tasks', desc: 'Designers get file uploads, devs get GitHub links, researchers get doc slots.' },
              { icon: 'fi-br-building', title: 'Your digital office', desc: 'Announcements, team directory, activity feed — a real remote workspace.' },
              { icon: 'fi-br-check-circle', title: 'Track everything', desc: 'Assigned → In Progress → Submitted → Approved. Nothing slips through.' },
            ].map((f, i) => (
              <div key={i} className="card p-4 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="mb-2 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
                  <i className={`fi ${f.icon}`} style={{ fontSize: 18, color: 'var(--accent)' }} />
                </div>
                <p className="text-sm font-medium mb-1">{f.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs" style={{ color: 'var(--text-3)' }}>
        © {new Date().getFullYear()} Teamer — Built for async teams
      </footer>
    </div>
  )
}
