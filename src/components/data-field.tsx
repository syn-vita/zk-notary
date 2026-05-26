type DataFieldProps = {
  label: string;
  value: string;
  mono?: boolean;
};

export function DataField({ label, value, mono = false }: DataFieldProps) {
  return (
    <div className="rounded-card border border-ui-border bg-surface px-4 py-3">
      <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd
        className={`mt-2 break-all text-[0.8125rem] leading-6 ${
          mono ? "font-mono text-accent" : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
