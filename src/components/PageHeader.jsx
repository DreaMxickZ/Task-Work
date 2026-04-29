export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <header className="border-b border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 sticky top-0 z-10">
      <div className="px-6 lg:px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold truncate">{title}</h1>
            {subtitle && <p className="text-sm text-ink-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </header>
  )
}
