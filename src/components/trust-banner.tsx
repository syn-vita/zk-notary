type TrustBannerProps = {
  title: string;
  body: string;
};

export function TrustBanner({ title, body }: TrustBannerProps) {
  return (
    <div className="mt-8 border-t border-ui-border pt-6">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
        {title}
      </p>
      <p className="mt-2 text-[0.8125rem] leading-6 text-muted">{body}</p>
    </div>
  );
}
