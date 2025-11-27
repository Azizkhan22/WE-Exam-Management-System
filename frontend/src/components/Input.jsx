const Input = ({ label, ...props }) => (
  <label className="text-sm text-gray-400 flex flex-col gap-1">
    {label}
    <input
      {...props}
      className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-brand-400 outline-none [appearance:textfield]
    [&::-webkit-outer-spin-button]:appearance-none
    [&::-webkit-inner-spin-button]:appearance-none"
    />
  </label>
);

export default Input;