import Link from "next/link";

export function OpsBreadcrumb({ page }: { page: string }) {
  return (
    <div className="text-[12px] text-gray-400 mb-1.5">
      <Link href="/operations" className="hover:text-gray-600 transition-colors">Dashboard</Link>
      <span className="mx-1.5">/</span>
      <span className="text-gray-600 font-medium">{page}</span>
    </div>
  );
}
