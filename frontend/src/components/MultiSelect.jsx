const MultiSelect = ({ label, options, value = [], onChange, ...props }) => {
  // Ensure value is always an array
  const selectedValues = Array.isArray(value) ? value : [];

  return (
    <label className="text-sm text-gray-400 flex flex-col gap-1">
      {label}
      <select
        {...props}
        multiple
        value={selectedValues}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions, (option) => option.value);
          if (onChange) onChange(selected);
        }}
        className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-brand-400 outline-none min-h-[100px]"
      >
        {options.map((option) => (
          <option key={option.id || option.value} value={option.id || option.value}>
            {option.label || option.title || option.name || option.code}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
    </label>
  );
};

export default MultiSelect;