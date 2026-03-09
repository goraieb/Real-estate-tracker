interface Props {
  value: number;
  onChange: (val: number) => void;
  label: string;
  required?: boolean;
}

export function CurrencyInput({ value, onChange, label, required }: Props) {
  const display = value
    ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    const num = parseInt(raw, 10);
    onChange(isNaN(num) ? 0 : num / 100);
  }

  return (
    <label className="form-field">
      <span className="form-label">{label}{required && ' *'}</span>
      <div className="currency-wrapper">
        <span className="currency-prefix">R$</span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          placeholder="0,00"
          required={required}
        />
      </div>
    </label>
  );
}
