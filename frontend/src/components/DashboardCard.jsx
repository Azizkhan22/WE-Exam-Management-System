const DashboardCard = ({ label, value, icon }) => (
  <div className="glass p-6 border border-white/10 flex items-center gap-4">
    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-brand-400">
      {icon}
    </div>
    <div>
      <p className="text-gray-400 text-sm uppercase tracking-[0.4em]">{label}</p>
      <p className="text-3xl font-display">{value}</p>
    </div>
  </div>
);

export default DashboardCard;