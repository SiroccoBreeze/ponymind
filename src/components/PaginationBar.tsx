'use client';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

export interface PaginationBarProps {
  /** 当前页码（1-based） */
  currentPage: number;
  /** 总页数 */
  totalPages: number;
  /** 页码切换回调 */
  onPageChange: (page: number) => void;
  /** 可选：总条数，用于展示「显示 x–y 条」 */
  totalCount?: number;
  /** 可选：每页条数，与 totalCount 一起用于展示范围 */
  pageSize?: number;
  /** 可选：aria-label，默认「分页」 */
  ariaLabel?: string;
  /** 可选：额外 class */
  className?: string;
}

/**
 * 公共分页条：最多展示 7 个页码 + 上一页/下一页，避免无限页码展示。
 * MASTER：rounded-lg、primary、focus-visible、transition 200ms。
 */
export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
  pageSize = 10,
  ariaLabel = '分页',
  className,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const from = totalCount != null ? (currentPage - 1) * pageSize + 1 : null;
  const to = totalCount != null ? Math.min(currentPage * pageSize, totalCount) : null;

  // 最多 7 个数字：与 PostList 一致
  const pageNumbers: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else if (currentPage <= 4) {
    for (let i = 1; i <= 5; i++) pageNumbers.push(i);
    pageNumbers.push('ellipsis');
    pageNumbers.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    pageNumbers.push(1);
    pageNumbers.push('ellipsis');
    for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    pageNumbers.push('ellipsis');
    pageNumbers.push(currentPage - 1);
    pageNumbers.push(currentPage);
    pageNumbers.push(currentPage + 1);
    pageNumbers.push('ellipsis');
    pageNumbers.push(totalPages);
  }

  return (
    <div className={className}>
      {from != null && to != null && totalCount != null && (
        <p className="text-center text-sm text-muted-foreground mb-2">
          第 {currentPage} 页，共 {totalPages} 页
          {totalCount > 0 && ` · 显示 ${from}–${to} 条，共 ${totalCount} 条`}
        </p>
      )}
      <Pagination>
        <PaginationContent className="gap-1" aria-label={ariaLabel}>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              aria-disabled={currentPage === 1}
              className="cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg transition-colors duration-200"
            />
          </PaginationItem>

          {pageNumbers.map((item, idx) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis className="rounded-lg" />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === item}
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(item);
                  }}
                  className="min-w-9 rounded-lg transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
              aria-disabled={currentPage === totalPages}
              className="cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg transition-colors duration-200"
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
