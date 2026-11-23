"use client";

import { Children, cloneElement, isValidElement, useRef, useState, type ReactNode, type HTMLAttributes } from "react";
import { useLocale } from "next-intl";

type TableProps = {
  children: ReactNode;
  className?: string;
  initialWidths?: number[];
  fitAvailableHeight?: boolean;
};

export function DataTable({ children, className = "", initialWidths, fitAvailableHeight }: TableProps) {
  const arabic = useLocale().startsWith("ar");
  const [widths, setWidths] = useState(initialWidths);
  const drag = useRef<{ pointer: number; x: number; direction: number; sizes: number[] } | null>(null);
  const table = useRef<HTMLTableElement>(null);

  function measure() {
    const cells = table.current?.tHead?.rows[0]?.cells;
    return Array.from(cells ?? [], cell => cell.getBoundingClientRect().width);
  }

  function resize(sizes: number[], index: number, delta: number) {
    setWidths(sizes.map((width, i) => i === index ? Math.max(64, width + delta) : width));
  }

  function renderHeader(node: ReactNode, index: number): ReactNode {
    if (!isValidElement<HTMLAttributes<HTMLElement>>(node)) return node;
    if (node.type === "thead" || node.type === "tr") {
      return cloneElement(node, {}, Children.map(node.props.children, renderHeader));
    }
    if (node.type !== "th") return node;
    const label = typeof node.props.children === "string" ? node.props.children : String(index + 1);
    const hint = arabic ? `تغيير عرض عمود ${label}` : `Resize column ${label}`;
    return cloneElement(node, {
      className: `${node.props.className ?? ""} sticky top-0 z-10 bg-revix-surface pe-4`,
    }, node.props.children, (
      <span role="separator" aria-orientation="vertical" aria-label={hint} title={hint}
        tabIndex={0} aria-valuemin={64} aria-valuenow={widths?.[index]}
        className="absolute inset-y-0 end-0 flex w-4 cursor-col-resize touch-none select-none items-center justify-center after:h-5 after:w-0.5 after:rounded-full after:bg-revix-secondary/50 hover:bg-revix-primary/10 focus-visible:outline-revix-primary"
        onClick={event => event.stopPropagation()}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault();
          const direction = getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
          drag.current = { pointer: event.pointerId, x: event.clientX, direction, sizes: measure() };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const start = drag.current;
          if (start?.pointer === event.pointerId) resize(start.sizes, event.currentTarget.closest("th")!.cellIndex, (event.clientX - start.x) * start.direction);
        }}
        onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={event => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const direction = getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
          resize(measure(), event.currentTarget.closest("th")!.cellIndex, (event.key === "ArrowRight" ? 12 : -12) * direction);
        }}
      />
    ));
  }

  return (
    <div className={`max-w-full overflow-auto ${fitAvailableHeight ? "min-h-0 flex-initial overscroll-contain" : "max-h-[min(65vh,680px)]"}`}>
      <table ref={table} className={`${className} w-full min-w-full border-collapse [&_th:last-child>span[role=separator]]:hidden ${widths ? "table-fixed [&_td]:overflow-hidden [&_td]:text-ellipsis" : ""}`}
        style={widths ? { width: widths.reduce((sum, width) => sum + width, 0) } : undefined}>
        {widths && <colgroup>{widths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>}
        {Children.map(children, renderHeader)}
      </table>
    </div>
  );
}
