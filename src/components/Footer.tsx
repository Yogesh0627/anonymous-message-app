import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t bg-card px-6 py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <div>
          <span className="font-semibold text-foreground">Candor</span>
          <span className="ml-2 text-muted-foreground">Honest feedback, real growth.</span>
        </div>

        <nav className="flex items-center gap-5">
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/help" className="transition-colors hover:text-foreground">
            Help
          </Link>
          <Link href="/roadmap" className="transition-colors hover:text-foreground">
            Roadmap
          </Link>
        </nav>

        <div className="flex flex-col items-center gap-1 text-muted-foreground sm:items-end">
          <span>© {year} Candor. All rights reserved.</span>
          <span>
            Created by{' '}
            <a
              href="https://yogeshchauhan.dev"
              target="_blank"
              rel="author me noopener noreferrer"
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              Yogesh Chauhan
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
