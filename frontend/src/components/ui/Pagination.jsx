import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Page control for the admin tables.
 *
 * These lists previously requested no page at all, so they showed the server's
 * first 50 rows and silently dropped the rest — with more than 50 schools, the
 * later ones could not be reached or approved from the UI at all.
 */
export default function Pagination({ page, totalPages, total, limit, onChange, label = 'items' }) {
  if (!totalPages || totalPages <= 1) {
    return total ? (
      <p className="px-5 py-3 text-[12px] text-gray-500 border-t border-[#E5E7EB]">
        {total} {label}
      </p>
    ) : null;
  }

  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <nav
      className="flex items-center justify-between gap-4 px-5 py-3 border-t border-[#E5E7EB] flex-wrap"
      aria-label="Pagination"
    >
      <p className="text-[12px] text-gray-500 tabular-nums">
        Showing <span className="font-semibold text-gray-700">{first}–{last}</span> of{' '}
        <span className="font-semibold text-gray-700">{total}</span> {label}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-gray-300 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
          Previous
        </button>

        <span className="px-3 text-[12px] font-semibold text-gray-600 tabular-nums">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-gray-300 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
        >
          Next
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  );
}
