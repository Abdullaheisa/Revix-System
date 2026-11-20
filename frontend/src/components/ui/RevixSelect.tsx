"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { RevixIcon } from "@/components/ui/RevixIcons";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface RevixSelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: readonly SelectOption[] | SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean | string;
  helperText?: string;
  size?: "sm" | "md";
  searchable?: boolean;
  isRtl?: boolean;
  className?: string;
  menuClassName?: string;
  buttonClassName?: string;
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  onBlur?: () => void;
  required?: boolean;
  "aria-label"?: string;
}

export function RevixSelect({
  id,
  name,
  value,
  defaultValue,
  options,
  placeholder,
  disabled = false,
  error = false,
  size = "md",
  searchable,
  isRtl = false,
  className = "",
  menuClassName = "",
  buttonClassName = "",
  onChange,
  onBlur,
  required,
  "aria-label": ariaLabel,
}: RevixSelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const listboxId = `${selectId}-listbox`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue ?? (options[0]?.value && !placeholder ? options[0].value : ""),
  );
  const currentValue = isControlled ? value : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<{
    top: number;
    bottom: number;
    left: number;
    width: number;
    placement: "bottom" | "top";
  } | null>(null);

  const isSearchEnabled =
    searchable !== undefined ? searchable : options.length > 7;

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === currentValue),
    [options, currentValue],
  );

  const filteredOptions = useMemo(() => {
    if (!isSearchEnabled || !searchQuery.trim()) {
      return options;
    }
    const query = searchQuery.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.description && opt.description.toLowerCase().includes(query)) ||
        opt.value.toLowerCase().includes(query),
    );
  }, [options, searchQuery, isSearchEnabled]);

  // Calculate fixed viewport coordinates for portal menu
  const updatePosition = useCallback(() => {
    if (!triggerButtonRef.current) return;
    const rect = triggerButtonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const neededSpace = 260;
    const nextPlacement: "bottom" | "top" =
      spaceBelow < neededSpace && rect.top > neededSpace ? "top" : "bottom";
    setCoords({
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      left: rect.left,
      width: rect.width,
      placement: nextPlacement,
    });
  }, []);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    setSearchQuery("");
    const initialIndex = filteredOptions.findIndex(
      (opt) => opt.value === currentValue,
    );
    setHighlightedIndex(initialIndex >= 0 ? initialIndex : 0);
  }, [disabled, updatePosition, filteredOptions, currentValue]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
    if (onBlur) onBlur();
  }, [onBlur]);

  const handleSelect = useCallback(
    (option: SelectOption) => {
      if (option.disabled || disabled) return;
      if (!isControlled) {
        setInternalValue(option.value);
      }
      onChange?.({
        target: {
          value: option.value,
          name,
        },
      });
      closeDropdown();
      triggerButtonRef.current?.focus();
    },
    [disabled, isControlled, name, onChange, closeDropdown],
  );

  // Close when clicking outside both trigger and portal menu
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, closeDropdown]);

  // Reposition portal menu on resize or external scroll
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updatePosition]);

  // Isolate wheel scrolling inside the dropdown so it never scrolls the background page
  useEffect(() => {
    if (!isOpen) return;
    const menuEl = menuRef.current;
    if (!menuEl) return;

    const handleWheel = (e: WheelEvent) => {
      const listEl = listRef.current;
      if (!listEl || !listEl.contains(e.target as Node)) {
        e.preventDefault();
        return;
      }
      const { scrollTop, scrollHeight, clientHeight } = listEl;
      if (scrollHeight <= clientHeight) {
        e.preventDefault();
        return;
      }
      const atTop = scrollTop <= 0 && e.deltaY < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
      if (atTop || atBottom) {
        e.preventDefault();
      }
    };

    menuEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      menuEl.removeEventListener("wheel", handleWheel);
    };
  }, [isOpen]);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen && isSearchEnabled) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isSearchEnabled]);

  // Keyboard navigation on trigger button
  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDropdown();
    }
  };

  // Keyboard navigation inside dropdown / search
  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      triggerButtonRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= filteredOptions.length ? 0 : next;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? filteredOptions.length - 1 : next;
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const targetOption = filteredOptions[highlightedIndex];
        if (targetOption && !targetOption.disabled) {
          handleSelect(targetOption);
        }
      }
      return;
    }

    if (e.key === "Tab") {
      closeDropdown();
    }
  };

  const hasError = Boolean(error);
  const sizeClasses =
    size === "sm"
      ? "h-[34px] px-2.5 text-[12.5px] rounded-[6px]"
      : "h-[46px] px-3.5 text-[14px] sm:text-[14.5px] rounded-control";

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-w-0 ${className}`.trim()}
      onKeyDown={isOpen ? handleMenuKeyDown : undefined}
    >
      {/* Hidden input for standard form submission */}
      <input
        type="hidden"
        name={name}
        value={currentValue}
        required={required}
      />

      {/* Trigger Button */}
      <button
        ref={triggerButtonRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-invalid={hasError || undefined}
        disabled={disabled}
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 border bg-revix-white text-start transition-colors duration-[var(--duration-fast)] focus:outline-none disabled:cursor-not-allowed disabled:bg-revix-surface disabled:text-revix-disabled tabular-nums ${sizeClasses} ${buttonClassName} ${
          hasError
            ? "border-revix-error focus:border-revix-error focus:ring-3 focus:ring-revix-error/15"
            : isOpen
              ? "border-revix-primary ring-3 ring-revix-primary/15"
              : "border-revix-border hover:border-revix-secondary/45 focus:border-revix-primary focus:ring-3 focus:ring-revix-primary/15"
        }`}
      >
        <span
          className={`truncate ${
            selectedOption
              ? "font-medium text-revix-dark"
              : "text-revix-secondary/75"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder || "—"}
        </span>

        <span
          className={`flex shrink-0 items-center text-revix-secondary transition-transform duration-200 ${
            isOpen ? "rotate-180 text-revix-primary" : ""
          }`}
        >
          <RevixIcon name="chevron-down" size={size === "sm" ? 13 : 15} />
        </span>
      </button>

      {/* Custom Dropdown Menu (Rendered in Portal to prevent clipping by overflow-hidden cards) */}
      {isOpen && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              tabIndex={-1}
              dir={isRtl ? "rtl" : "ltr"}
              onKeyDown={handleMenuKeyDown}
              style={{
                position: "fixed",
                left: coords.left,
                width: coords.width,
                ...(coords.placement === "top"
                  ? { bottom: coords.bottom }
                  : { top: coords.top }),
                zIndex: 9999,
              }}
              className={`overflow-hidden rounded-[8px] border border-revix-border bg-revix-white shadow-dialog animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`.trim()}
            >
              {/* Search bar inside menu */}
              {isSearchEnabled ? (
                <div className="border-b border-revix-border/70 p-1.5">
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-revix-secondary">
                      <RevixIcon name="search" size={13} />
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setHighlightedIndex(0);
                      }}
                      placeholder={isRtl ? "بحث..." : "Search..."}
                      className="h-[32px] w-full rounded-[6px] border border-revix-border bg-revix-surface/60 ps-8 pe-7 text-[12.5px] text-revix-dark placeholder:text-revix-secondary/70 focus:border-revix-primary focus:bg-revix-white focus:outline-none"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 end-2 flex items-center text-revix-secondary hover:text-revix-dark"
                      >
                        <RevixIcon name="close" size={12} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Options List */}
              <div
                ref={listRef}
                className="max-h-[220px] overflow-y-auto overscroll-contain p-1 focus:outline-none"
              >
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-3 text-center text-[12.5px] text-revix-secondary">
                    {isRtl ? "لا توجد نتائج مطابقة" : "No results found"}
                  </div>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const isSelected = opt.value === currentValue;
                    const isHighlighted = idx === highlightedIndex;

                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={opt.disabled}
                        onClick={() => handleSelect(opt)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`flex items-center justify-between gap-2 rounded-[6px] px-3 py-2 text-[13px] sm:text-[13.5px] transition-colors tabular-nums ${
                          opt.disabled
                            ? "cursor-not-allowed opacity-40 text-revix-disabled"
                            : "cursor-pointer"
                        } ${
                          isSelected
                            ? "bg-revix-tint font-semibold text-revix-primary"
                            : isHighlighted
                              ? "bg-revix-surface text-revix-dark font-medium"
                              : "text-revix-dark font-normal hover:bg-revix-surface"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{opt.label}</span>
                          {opt.description ? (
                            <span className="truncate text-[11px] text-revix-secondary">
                              {opt.description}
                            </span>
                          ) : null}
                        </div>

                        {isSelected ? (
                          <span className="shrink-0 text-revix-primary">
                            <RevixIcon name="check" size={14} />
                          </span>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
