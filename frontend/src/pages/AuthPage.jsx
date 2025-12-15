import { useEffect, useMemo, useState } from 'react';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuthStore } from '../store/authStore';


const AuthPage = () => {
  const navigate = useNavigate();
  const [semesters, setSemesters] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [loginFields, setLoginFields] = useState({ email: '', password: '' });

  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const { data } = await apiClient.get('/catalog/semesters');
        setSemesters(data);
      } catch (error) {
        console.error('Failed to fetch semesters', error);
      }
    };
    loadSemesters();
  }, []);

  const sortedSemesters = useMemo(
    () => [...semesters].sort((a, b) => a.title.localeCompare(b.title)),
    [semesters]
  );
  const login = useAuthStore((state) => state.login);
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const loggedUser = await login(loginFields);

      setStatus({
        type: 'success',
        message: `Welcome back ${loggedUser.fullName}`,
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 800);

    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error.response?.data?.message ||
          'Unable to log in. Check credentials.',
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
          onClick={() => navigate('/')} // <-- navigate to home
          className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition fixed top-4 left-4 z-50"
        >
          Back to Home
        </button>
    <div className="min-h-screen text-white px-6 md:px-12 py-12">
       
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-stretch">
       
        <div className="glass p-8 space-y-6 border border-white/10">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Portal access</p>
            <h2 className="text-3xl font-display mt-2">Admin / Invigilator Login</h2>
            <p className="text-gray-400 mt-2">
              Access the immersive dashboard, CRUD suite, allocation engine, and analytics.
            </p>
          </div>

          {status.message && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${status.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/10 border border-rose-500/40 text-rose-200'
                }`}
            >
              {status.message}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="text-sm text-gray-400">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 focus:border-brand-400 outline-none"
                value={loginFields.email}
                onChange={(e) => setLoginFields((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 focus:border-brand-400 outline-none"
                value={loginFields.password}
                onChange={(e) =>
                  setLoginFields((prev) => ({ ...prev, password: e.target.value }))
                }
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-accent font-medium disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Enter dashboard'}
            </button>
            <p className="text-xs text-gray-500">
              In case of forgotten credentials, please contact your Tech admin.
            </p>
          </form>
        </div>

        <div className="glass p-8 border border-white/10 space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Highlights</p>
          <ul className="space-y-4 text-gray-300">
            <li>
              • Deterministic seat assignments leveraging indexed semester + roll ordering to keep
              things fair.
            </li>
            <li>
              • Manual swap endpoint validates in real-time—great for on-the-ground invigilator
              adjustments.
            </li>
            <li>• jsPDF exports deliver per-room sheets plus a consolidated pack for briefing.</li>
            <li>• Search-ready dashboard with smooth transitions and tactile hover states.</li>
          </ul>
          <div className="rounded-3xl gradient-border p-6">
            <p className="text-sm text-gray-300 uppercase tracking-[0.4em]">Need access?</p>
            <h3 className="text-2xl font-display mt-2">Admins & invigilators</h3>
            <p className="text-gray-400 mt-2">
              Reach out to your academic lead for elevated roles or create a custom admin via the
              backend once logged in.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default AuthPage;

