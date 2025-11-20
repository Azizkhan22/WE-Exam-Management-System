import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiLayers, FiShield, FiGrid, FiCheckCircle } from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api';
import { use, useEffect, useState } from 'react';


const stat = [
  { label: 'Departments onboarded', value: '24+' },
  { label: 'Seats arranged this year', value: '18,400' },
  { label: 'Exam rooms optimized', value: '320' },
  { label: 'Avg. planning time', value: '4 min' },
];



const features = [
  {
    icon: <FiShield className="text-brand-400" size={26} />,
    title: 'Role-aware access',
    description: 'Dedicated flows for students and invigilators or admins with secure JWT auth.',
  },
  {
    icon: <FiLayers className="text-brand-400" size={26} />,
    title: 'Smart allocation engine',
    description:
      'Round-robin seat distribution with adjacency-aware logic to keep semesters balanced.',
  },
  {
    icon: <FiGrid className="text-brand-400" size={26} />,
    title: 'Immersive dashboards',
    description:
      'Live occupancy, search, CRUD workflows, and animated seating grids that feel tactile.',
  },
];

const steps = [
  'Import or register students & rooms',
  'Select semesters and generate plans',
  'Fine-tune seats manually if needed',
  'Export gorgeous PDF packs for invigilators',
];

const LandingPage = () => {
  const { user } = useAuthStore();
  const [statLoader, setStatLoader] = useState();
  const [statData, setStatData] = useState([]);

  const loadStats = async () => {
    setStatLoader(true);
    try {
      const response = await apiClient.get('/search/stats');      
      const data = response.data;
      console.log(data);
      if (data) {
        setStatData(data);
      } else {
        setStatData(stat);
      }
    } catch (error) {
      console.error('Error fetching stats', error);
      setStatData
    } finally {
      setStatLoader(false);
    }

  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="text-white">
      <header className="px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="text-xl tracking-[0.4em] uppercase text-gray-300">KAEMS</div>
        <nav className="hidden md:flex gap-8 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#workflow" className="hover:text-white transition-colors">
            Workflow
          </a>
          <a href="#cta" className="hover:text-white transition-colors">
            Access
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to={user.role === 'admin' ? '/dashboard' : '/student-seat'}
              className="px-4 py-2 rounded-xl border border-white/20 hover:border-brand-400 transition-all"
            >
              Continue
            </Link>
          ) : (
            <>
              <Link to="/auth" className="text-sm text-gray-300 hover:text-white transition">
                Login
              </Link>
              <Link
                to="/auth"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent shadow-glass"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="px-6 md:px-12 py-12 md:py-20 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-[0.3em] text-white/70">
            Seamless Exam Orchestration
          </div>
          <h1 className="text-4xl md:text-6xl font-display leading-tight">
            Modern seating plans with <span className="text-brand-400">zero</span> chaos
          </h1>
          <p className="text-lg text-gray-300 max-w-xl">
            Build, balance, and broadcast exam arrangements in minutes. Students see their seat in a
            single search, while admins enjoy fluid CRUD workflows, manual swaps, and one-click PDF
            packs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/auth"
              className="px-6 py-3 rounded-2xl gradient-border font-medium flex items-center justify-center gap-2"
            >
              Enter portal <FiArrowRight />
            </Link>
            <Link
              to="/student-seat"
              className="px-6 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur font-medium flex items-center justify-center gap-2"
            >
              Find my seat
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="glass p-8 space-y-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-brand-500/10 to-transparent" />
          <div className="relative space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Live Snapshot</p>
            <h3 className="text-2xl font-display">Exam Week • Digital Campus</h3>
          </div>
          {statLoader ? <div className='w-[100%] h-[100px] flex items-center justify-center'>
            <div className="w-10 h-10 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
          </div> : <div className="grid grid-cols-2 gap-4">
            {/* {statData.map((sta) => (
              <div key={stat.label} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-sm text-gray-400">{sta.label}</p>
                <p className="text-2xl font-semibold mt-2">{sta.value}</p>
              </div>
            ))} */}
            {
              Object.entries(statData).map(([key, value]) => (
                <div key={key} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-sm text-gray-400">{key}</p>
                <p className="text-2xl font-semibold mt-2">{value}</p>
              </div>
              ))
            }
          </div>}

          <div className="rounded-2xl border border-white/10 p-4 flex items-center gap-3 bg-white/5 backdrop-blur">
            <FiCheckCircle className="text-brand-400" size={32} />
            <div>
              <p className="font-medium">Seat engine locked</p>
              <p className="text-sm text-gray-400">Round-robin assignment confirmed</p>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="px-6 md:px-12 py-16 md:py-24 space-y-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-gray-400">WHY WEEMS</p>
            <h2 className="text-3xl md:text-4xl font-display mt-2">A playground for exam admins</h2>
          </div>
          <div className="text-gray-300 max-w-xl">
            Hyper-focused UX with depth cues, neon gradients, and micro interactions that keep admins
            energized. Every interaction is optimized for speed.
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              whileHover={{ y: -6 }}
              className="glass p-6 space-y-4 border border-white/10"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="workflow" className="px-6 md:px-12 py-16 md:py-24">
        <div className="glass p-8 md:p-12 space-y-8">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">FLOW</p>
            <h2 className="text-3xl font-display">Glide through planning</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step} className="space-y-4">
                <div className="text-4xl font-display text-brand-400/60">0{index + 1}</div>
                <p className="text-lg text-gray-200">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="px-6 md:px-12 py-16 md:py-24">
        <div className="glass p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">ACCESS</p>
            <h2 className="text-3xl font-display mt-2">Two entry points, one ecosystem</h2>
            <p className="text-gray-300 mt-4 max-w-2xl">
              Students land on a calming search experience, while invigilators and admins jump
              straight into analytics, CRUD suites, and real-time seat sculpting.
            </p>
          </div>
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <Link
              to="/student-seat"
              className="px-6 py-3 rounded-2xl border border-white/15 bg-white/5 text-center"
            >
              Search Seat
            </Link>
            <Link
              to="/auth"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-accent text-center"
            >
              Admin / Invigilator login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

