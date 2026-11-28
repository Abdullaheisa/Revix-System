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

export interface RevixDatePickerProps {
  id?: string;
  name?: string;
  value?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean | string;
  size?: "sm" | "md";
  isRtl?: boolean;
  withTime?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  required?: boolean;
  "aria-label"?: string;
}

const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_NAMES_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const WEEKDAY_NAMES_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_NAMES_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

/** Formats a year, month (0-11), and day (1-31) into "YYYY-MM-DD" */
function toDateString(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" safely without timezone shifts */
function parseDateParts(val?: string) {
  if (!val || typeof val !== "string") return null;
  const [datePart, timePart] = val.split("T");
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  let hour = 12;
  let minute = 0;
  if (timePart) {
    const [hStr, mStr] = timePart.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (!isNaN(h)) hour = h;
    if (!isNaN(m)) minute = m;
  }

  return { year, month, day, hour, minute };
}

export function RevixDatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled = false,
  error = false,
  size = "md",
  isRtl = false,
  withTime = false,
  minDate,
  maxDate,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  required,
  "aria-label": ariaLabel,
}: RevixDatePickerProps) {
  const generatedId = useId();
  const datePickerId = id ?? generatedId;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue || "");
  const currentValue = isControlled ? value : internalValue;

  const parsedCurrent = useMemo(() => parseDateParts(currentValue), [currentValue]);

  // Calendar View State (which month & year is being browsed)
  const today = useMemo(() => {
    const d = new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
    };
  }, []);

  const [viewYear, setViewYear] = useState<number>(
    parsedCurrent?.year ?? today.year,
  );
  const [viewMonth, setViewMonth] = useState<number>(
    parsedCurrent?.month ?? today.month,
  );

  // Time state for withTime
  const [selectedHour, setSelectedHour] = useState<number>(
    parsedCurrent?.hour ?? 12,
  );
  const [selectedMinute, setSelectedMinute] = useState<number>(
    parsedCurrent?.minute ?? 0,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    bottom: number;
    left: number;
    placement: "bottom" | "top";
  } | null>(null);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);

  // Sync view when controlled value changes and popup opens


  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const neededSpace = withTime ? 420 : 360;
    const nextPlacement: "bottom" | "top" =
      spaceBelow < neededSpace && rect.top > spaceBelow ? "top" : "bottom";

    const popupWidth = 310;
    const rawLeft = isRtl ? rect.right - popupWidth : rect.left;
    const clampedLeft = Math.max(8, Math.min(rawLeft, window.innerWidth - popupWidth - 8));

    setCoords({
      top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 280)),
      bottom: Math.max(8, window.innerHeight - rect.top + 6),
      left: clampedLeft,
      placement: nextPlacement,
    });
  }, [withTime, isRtl]);

  const openPopup = useCallback(() => {
    if (disabled) return;
    if (parsedCurrent) {
      setViewYear(parsedCurrent.year); setViewMonth(parsedCurrent.month);
      setSelectedHour(parsedCurrent.hour); setSelectedMinute(parsedCurrent.minute);
    }
    updatePosition();
    setIsOpen(true);
    setIsYearPickerOpen(false);
  }, [disabled, parsedCurrent, updatePosition]);

  const closePopup = useCallback(() => {
    setIsOpen(false);
    setIsYearPickerOpen(false);
  }, []);

  // Close on outside click (check both trigger container and portal popup)
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insidePopup = popupRef.current?.contains(target);
      if (!insideTrigger && !insidePopup) {
        closePopup();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, closePopup]);

  // Reposition portal popup on resize or external scroll
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScroll = (e: Event) => {
      if (popupRef.current && popupRef.current.contains(e.target as Node)) {
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

  // Keyboard navigation on popup
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closePopup();
      triggerRef.current?.focus();
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDate = (dateStr: string) => {
    let finalVal = dateStr;
    if (withTime) {
      const hh = String(selectedHour).padStart(2, "0");
      const mm = String(selectedMinute).padStart(2, "0");
      finalVal = `${dateStr}T${hh}:${mm}`;
    }

    if (!isControlled) {
      setInternalValue(finalVal);
    }
    onChange?.(finalVal);

    if (!withTime) {
      closePopup();
      triggerRef.current?.focus();
    }
  };

  const handleTimeChange = (newHour: number, newMinute: number) => {
    setSelectedHour(newHour);
    setSelectedMinute(newMinute);
    if (parsedCurrent) {
      const dateStr = toDateString(
        parsedCurrent.year,
        parsedCurrent.month,
        parsedCurrent.day,
      );
      const hh = String(newHour).padStart(2, "0");
      const mm = String(newMinute).padStart(2, "0");
      const finalVal = `${dateStr}T${hh}:${mm}`;
      if (!isControlled) setInternalValue(finalVal);
      onChange?.(finalVal);
    }
  };

  const handleTodayClick = () => {
    const dateStr = toDateString(today.year, today.month, today.day);
    let finalVal = dateStr;
    if (withTime) {
      const hh = String(today.hour).padStart(2, "0");
      const mm = String(today.minute).padStart(2, "0");
      finalVal = `${dateStr}T${hh}:${mm}`;
    }
    setViewYear(today.year);
    setViewMonth(today.month);
    setSelectedHour(today.hour);
    setSelectedMinute(today.minute);

    if (!isControlled) setInternalValue(finalVal);
    onChange?.(finalVal);
    closePopup();
    triggerRef.current?.focus();
  };

  const handleClearClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isControlled) setInternalValue("");
    onChange?.("");
    closePopup();
    triggerRef.current?.focus();
  };

  // Days Calculation for Current View
  const calendarDays = useMemo(() => {
    // Total days in current month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Weekday of 1st day of current month (0 = Sun, 1 = Mon...)
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

    // Days in previous month to fill leading slots
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: {
      dayNumber: number;
      isCurrentMonth: boolean;
      dateString: string;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }[] = [];

    // Leading days from previous month
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = toDateString(prevYear, prevMonth, d);
      let isDisabled = false;
      if (minDate && dateStr < minDate) isDisabled = true;
      if (maxDate && dateStr > maxDate) isDisabled = true;
      const isSelected =
        parsedCurrent !== null &&
        parsedCurrent.year === prevYear &&
        parsedCurrent.month === prevMonth &&
        parsedCurrent.day === d;
      const isToday =
        today.year === prevYear &&
        today.month === prevMonth &&
        today.day === d;
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateString: dateStr,
        isSelected,
        isToday,
        isDisabled,
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateString(viewYear, viewMonth, d);
      const isSelected =
        parsedCurrent !== null &&
        parsedCurrent.year === viewYear &&
        parsedCurrent.month === viewMonth &&
        parsedCurrent.day === d;

      const isToday =
        today.year === viewYear &&
        today.month === viewMonth &&
        today.day === d;

      let isDisabled = false;
      if (minDate && dateStr < minDate) isDisabled = true;
      if (maxDate && dateStr > maxDate) isDisabled = true;

      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateString: dateStr,
        isSelected,
        isToday,
        isDisabled,
      });
    }

    // Trailing days from next month to complete 6 rows (42 days)
    const remainingSlots = 42 - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = toDateString(nextYear, nextMonth, d);
      let isDisabled = false;
      if (minDate && dateStr < minDate) isDisabled = true;
      if (maxDate && dateStr > maxDate) isDisabled = true;
      const isSelected =
        parsedCurrent !== null &&
        parsedCurrent.year === nextYear &&
        parsedCurrent.month === nextMonth &&
        parsedCurrent.day === d;
      const isToday =
        today.year === nextYear &&
        today.month === nextMonth &&
        today.day === d;
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateString: dateStr,
        isSelected,
        isToday,
        isDisabled,
      });
    }

    return days;
  }, [viewYear, viewMonth, parsedCurrent, today, minDate, maxDate]);

  // Display label for Trigger button
  const displayLabel = useMemo(() => {
    if (!parsedCurrent) return placeholder || (isRtl ? "اختر التاريخ..." : "Select date...");
    const monthName = isRtl
      ? MONTH_NAMES_AR[parsedCurrent.month]
      : MONTH_NAMES_EN[parsedCurrent.month]?.slice(0, 3);
    const dateFormatted = `${parsedCurrent.day} ${monthName} ${parsedCurrent.year}`;
    if (withTime) {
      const hh = String(parsedCurrent.hour).padStart(2, "0");
      const mm = String(parsedCurrent.minute).padStart(2, "0");
      return `${dateFormatted} - ${hh}:${mm}`;
    }
    return dateFormatted;
  }, [parsedCurrent, placeholder, isRtl, withTime]);

  // Year quick range
  const yearRange = useMemo(() => {
    const current = today.year;
    const years: number[] = [];
    for (let y = current - 15; y <= current + 15; y++) {
      years.push(y);
    }
    return years;
  }, [today.year]);

  const hasError = Boolean(error);
  const sizeClasses =
    size === "sm"
      ? "h-[34px] px-2.5 text-[12.5px] rounded-lg"
      : "h-[46px] px-3.5 text-[14px] sm:text-[14.5px] rounded-control";

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-w-0 ${className}`.trim()}
      onKeyDown={isOpen ? handleKeyDown : undefined}
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
        ref={triggerRef}
        id={datePickerId}
        type="button"
        role="combobox"
        aria-haspopup="dialog"
        aria-controls={isOpen ? `${datePickerId}-popup` : undefined}
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-invalid={hasError || undefined}
        disabled={disabled}
        onClick={() => (isOpen ? closePopup() : openPopup())}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 border bg-white text-start transition-colors duration-[var(--duration-fast)] focus:outline-hidden disabled:cursor-not-allowed disabled:bg-revix-surface disabled:text-revix-disabled ${sizeClasses} ${buttonClassName} ${
          hasError
            ? "border-revix-error focus:border-revix-error focus:ring-3 focus:ring-revix-error/15"
            : isOpen
              ? "border-revix-primary ring-3 ring-revix-primary/15"
              : "border-revix-border hover:border-revix-secondary/45 focus:border-revix-primary focus:ring-3 focus:ring-revix-primary/15"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-revix-secondary">
            <RevixIcon name={withTime ? "clock" : "calendar"} size={size === "sm" ? 14 : 16} />
          </span>
          <span
            className={`truncate ${
              parsedCurrent
                ? "font-medium text-revix-dark"
                : "text-revix-secondary/75"
            }`}
          >
            {displayLabel}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {currentValue && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearClick}
              title={isRtl ? "مسح التاريخ" : "Clear date"}
              className="rounded-full p-0.5 text-revix-muted hover:bg-revix-surface hover:text-revix-dark transition-colors"
            >
              <RevixIcon name="close" size={12} />
            </span>
          )}
          <span
            className={`text-revix-secondary transition-transform duration-200 ${
              isOpen ? "rotate-180 text-revix-primary" : ""
            }`}
          >
            <RevixIcon name="chevron-down" size={size === "sm" ? 13 : 15} />
          </span>
        </div>
      </button>

      {/* Custom Revix Calendar Popup (Rendered in Portal to prevent clipping by overflow-hidden cards) */}
      {isOpen && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popupRef}
              role="dialog"
              id={`${datePickerId}-popup`}
              aria-label={isRtl ? "منتقي التاريخ" : "Date Picker"}
              dir={isRtl ? "rtl" : "ltr"}
              onKeyDown={handleKeyDown}
              style={{
                position: "fixed",
                left: coords.left,
                ...(coords.placement === "top"
                  ? { bottom: coords.bottom }
                  : { top: coords.top }),
                maxHeight: "calc(100dvh - 16px)",
                overflowY: "auto",
                zIndex: 9999,
              }}
              className={`w-[310px] overflow-hidden rounded-xl border border-revix-border bg-white p-3.5 shadow-dialog animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`.trim()}
            >
          {/* Header Navigation */}
          <div className="flex items-center justify-between pb-2.5 border-b border-revix-border/70">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-revix-secondary hover:bg-revix-surface hover:text-revix-dark transition-colors"
              title={isRtl ? "الشهر السابق" : "Previous Month"}
            >
              <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
            </button>

            {/* Month & Year Title / Dropdown Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsYearPickerOpen((prev) => !prev)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-revix-dark hover:bg-revix-surface hover:text-revix-primary transition-colors"
              >
                <span>
                  {isRtl ? MONTH_NAMES_AR[viewMonth] : MONTH_NAMES_EN[viewMonth]} {viewYear}
                </span>
                <RevixIcon
                  name="chevron-down"
                  size={12}
                  className={`transition-transform ${isYearPickerOpen ? "rotate-180 text-revix-primary" : ""}`}
                />
              </button>

              {/* Quick Year Picker Overlay */}
              {isYearPickerOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-10 max-h-48 w-40 overflow-y-auto rounded-lg border border-revix-border bg-white p-1 shadow-dialog">
                  <div className="grid grid-cols-2 gap-1 text-center">
                    {yearRange.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setViewYear(yr);
                          setIsYearPickerOpen(false);
                        }}
                        className={`rounded-md px-1.5 py-1 text-[11px] font-semibold transition-colors ${
                          yr === viewYear
                            ? "bg-revix-primary text-white"
                            : "text-revix-dark hover:bg-revix-surface"
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-revix-secondary hover:bg-revix-surface hover:text-revix-dark transition-colors"
              title={isRtl ? "الشهر القادم" : "Next Month"}
            >
              <RevixIcon name={isRtl ? "arrow-left" : "arrow-right"} size={14} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="mt-2 grid grid-cols-7 text-center text-[10.5px] font-semibold text-revix-muted">
            {(isRtl ? WEEKDAY_NAMES_AR : WEEKDAY_NAMES_EN).map((wk, i) => (
              <div key={i} className="py-1">
                {wk}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((cd, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={cd.isDisabled}
                  onClick={() => handleSelectDate(cd.dateString)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all duration-100 ${
                    cd.isDisabled
                      ? "cursor-not-allowed opacity-30 text-revix-disabled"
                      : cd.isSelected
                        ? "bg-revix-primary text-white shadow-xs scale-105"
                        : cd.isToday
                          ? "border border-revix-primary text-revix-primary font-bold hover:bg-revix-tint"
                          : cd.isCurrentMonth
                            ? "cursor-pointer bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
                            : "cursor-pointer bg-emerald-50/40 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
                  }`}
                >
                  {cd.dayNumber}
                </button>
            ))}
          </div>

          {/* Time Picker Section (if withTime is true) */}
          {withTime && (
            <div className="mt-3 border-t border-revix-border/70 pt-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-revix-secondary flex items-center gap-1">
                  <RevixIcon name="clock" size={13} />
                  <span>{isRtl ? "الوقت:" : "Time:"}</span>
                </span>
                <div className="flex items-center gap-1 font-mono">
                  {/* Hours */}
                  <select
                    value={selectedHour}
                    onChange={(e) => handleTimeChange(Number(e.target.value), selectedMinute)}
                    className="h-7 rounded-md border border-revix-border bg-white px-1.5 text-xs font-bold text-revix-dark focus:border-revix-primary focus:outline-hidden"
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <span>:</span>
                  {/* Minutes */}
                  <select
                    value={selectedMinute}
                    onChange={(e) => handleTimeChange(selectedHour, Number(e.target.value))}
                    className="h-7 rounded-md border border-revix-border bg-white px-1.5 text-xs font-bold text-revix-dark focus:border-revix-primary focus:outline-hidden"
                  >
                    {Array.from({ length: 12 }).map((_, mIdx) => {
                      const m = mIdx * 5;
                      return (
                        <option key={m} value={m}>
                          {String(m).padStart(2, "0")}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-revix-border/70 pt-2 text-xs">
            <button
              type="button"
              onClick={handleClearClick}
              className="font-medium text-revix-secondary hover:text-revix-alert transition-colors"
            >
              {isRtl ? "مسح" : "Clear"}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTodayClick}
                className="font-semibold text-revix-primary hover:underline"
              >
                {isRtl ? "اليوم" : "Today"}
              </button>

              {withTime && (
                <button
                  type="button"
                  onClick={closePopup}
                  className="rounded-md bg-revix-primary px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover"
                >
                  {isRtl ? "تأكيد" : "Done"}
                </button>
              )}
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
