import Link from "next/link";

// Bouton unique — SPC Premium Operations Design System.
// Hiérarchie claire : primary (navy) · accent (indigo) · secondary · danger · ghost.
// Polymorphe : rend un <Link> si `href`, sinon un <button>.

type Variant = "primary" | "accent" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "text-white shadow-sm bg-gradient-to-b from-[#173650] to-[#0F2942] hover:from-[#1c405e] hover:to-[#13314b] focus-visible:ring-slate-400",
  accent: "text-white shadow-sm bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-400",
  secondary: "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-300",
  danger: "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 focus-visible:ring-rose-300",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-2 text-[12.5px] gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-[13px] gap-1.5 rounded-xl",
};

function classes(variant: Variant, size: Size, extra?: string) {
  return `inline-flex items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none ${SIZES[size]} ${VARIANTS[variant]} ${extra ?? ""}`;
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...rest
}: CommonProps & { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
