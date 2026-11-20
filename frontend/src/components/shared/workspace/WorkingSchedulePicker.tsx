"use client";

import { useMemo } from "react";
import { RevixSelect } from "@/components/ui/RevixSelect";

export type WeekdayKey =
  | "Sun"
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat";

export interface DaySchedule {
  day: WeekdayKey;
  open: boolean;
  start: string;
  end: string;
}

const WEEKDAYS: readonly { key: WeekdayKey; en: string; ar: string }[] = [
  { key: "Sun", en: "Sunday", ar: "الأحد" },
  { key: "Mon", en: "Monday", ar: "الإثنين" },
  { key: "Tue", en: "Tuesday", ar: "الثلاثاء" },
  { key: "Wed", en: "Wednesday", ar: "الأربعاء" },
  { key: "Thu", en: "Thursday", ar: "الخميس" },
  { key: "Fri", en: "Friday", ar: "الجمعة" },
  { key: "Sat", en: "Saturday", ar: "السبت" },
] as const;

const TIME_SLOTS: readonly string[] = (() => {
  const slots: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    const hh = String(h).padStart(2, "0");
    slots.push(`${hh}:00`);
    slots.push(`${hh}:30`);
  }
  slots.push("23:59");
  return slots;
})();

const TIME_SLOT_OPTIONS = TIME_SLOTS.map((s) => ({ value: s, label: s }));

const DEFAULT_START = "08:00";
const DEFAULT_END = "22:00";

function normalizeTime(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (TIME_SLOTS.includes(trimmed)) return trimmed;
  return fallback;
}

export function parseWorkingSchedule(
  workingDays: string,
  workingHours: string,
): DaySchedule[] {
  const hoursMatch = workingHours.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
  const fallbackStart = normalizeTime(hoursMatch?.[1], DEFAULT_START);
  const fallbackEnd = normalizeTime(hoursMatch?.[2], DEFAULT_END);

  const raw = workingDays.trim();

  // Structured per-day format: "Sun 08:00-22:00 | Mon 09:00-21:00"
  if (raw.includes("|") || /\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+\d{2}:\d{2}/.test(raw)) {
    const byDay = new Map<WeekdayKey, { start: string; end: string }>();
    const parts = raw.split("|");
    for (const part of parts) {
      const m = part
        .trim()
        .match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/);
      if (m) {
        const key = m[1] as WeekdayKey;
        byDay.set(key, {
          start: normalizeTime(m[2], fallbackStart),
          end: normalizeTime(m[3], fallbackEnd),
        });
      }
    }
    if (byDay.size > 0) {
      return WEEKDAYS.map(({ key }) => {
        const found = byDay.get(key);
        return found
          ? { day: key, open: true, start: found.start, end: found.end }
          : { day: key, open: false, start: fallbackStart, end: fallbackEnd };
      });
    }
  }

  // Legacy list or range format: "Sun, Mon, Tue" or "Sun - Thu" or "الأحد - الخميس"
  const openSet = new Set<WeekdayKey>();
  for (const w of WEEKDAYS) {
    if (
      new RegExp(`\\b${w.key}\\b`, "i").test(raw) ||
      raw.includes(w.ar)
    ) {
      openSet.add(w.key);
    }
  }

  if (
    openSet.size === 2 &&
    (raw.includes("-") || raw.includes("–")) &&
    !raw.includes(",")
  ) {
    const indices = WEEKDAYS.map((w, idx) => (openSet.has(w.key) ? idx : -1)).filter(
      (idx) => idx >= 0,
    );
    if (indices.length === 2) {
      const [startIdx, endIdx] = indices;
      for (let i = startIdx; i <= endIdx; i += 1) {
        openSet.add(WEEKDAYS[i].key);
      }
    }
  }

  // Fallback default: Sun - Thu open
  if (openSet.size === 0) {
    openSet.add("Sun");
    openSet.add("Mon");
    openSet.add("Tue");
    openSet.add("Wed");
    openSet.add("Thu");
  }

  return WEEKDAYS.map(({ key }) => ({
    day: key,
    open: openSet.has(key),
    start: fallbackStart,
    end: fallbackEnd,
  }));
}

export function serializeWorkingSchedule(schedule: DaySchedule[]): {
  workingDays: string;
  workingHours: string;
} {
  const openDays = schedule.filter((d) => d.open);
  if (openDays.length === 0) {
    return {
      workingDays: "Closed",
      workingHours: "00:00 - 00:00",
    };
  }

  const first = openDays[0];
  const allSameHours = openDays.every(
    (d) => d.start === first.start && d.end === first.end,
  );

  if (allSameHours) {
    return {
      workingDays: openDays.map((d) => d.day).join(", "),
      workingHours: `${first.start} - ${first.end}`,
    };
  }

  // Per-day format fits comfortably within VARCHAR(160) (max ~130 chars for 7 days)
  return {
    workingDays: openDays
      .map((d) => `${d.day} ${d.start}-${d.end}`)
      .join(" | "),
    workingHours: `${first.start} - ${first.end} (Per day)`,
  };
}

export interface WorkingSchedulePickerProps {
  isRtl: boolean;
  workingDays: string;
  workingHours: string;
  onChange: (next: { workingDays: string; workingHours: string }) => void;
}

export function WorkingSchedulePicker({
  isRtl,
  workingDays,
  workingHours,
  onChange,
}: WorkingSchedulePickerProps) {
  const schedule = useMemo(
    () => parseWorkingSchedule(workingDays, workingHours),
    [workingDays, workingHours],
  );

  function commit(nextSchedule: DaySchedule[]) {
    onChange(serializeWorkingSchedule(nextSchedule));
  }

  function handleToggleDay(dayKey: WeekdayKey) {
    const next = schedule.map((item) =>
      item.day === dayKey ? { ...item, open: !item.open } : item,
    );
    commit(next);
  }

  function handleTimeChange(
    dayKey: WeekdayKey,
    field: "start" | "end",
    value: string,
  ) {
    const next = schedule.map((item) =>
      item.day === dayKey ? { ...item, [field]: value } : item,
    );
    commit(next);
  }

  function handleApplyFirstToAllOpen() {
    const firstOpen = schedule.find((d) => d.open);
    if (!firstOpen) return;
    const next = schedule.map((item) =>
      item.open
        ? { ...item, start: firstOpen.start, end: firstOpen.end }
        : item,
    );
    commit(next);
  }

  function handlePreset247() {
    const next = schedule.map((item) => ({
      ...item,
      open: true,
      start: "00:00",
      end: "23:59",
    }));
    commit(next);
  }

  const openCount = schedule.filter((d) => d.open).length;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="block text-[14px] font-medium text-revix-dark">
            {isRtl ? "أيام وساعات العمل" : "Working days & hours"}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleApplyFirstToAllOpen}
            className="cursor-pointer rounded-[6px] border border-revix-border bg-revix-white px-2.5 py-1 text-[11.5px] font-medium text-revix-dark transition-colors hover:border-revix-primary hover:bg-revix-tint hover:text-revix-primary"
          >
            {isRtl ? "توحيد الوقت للأيام المفتوحة" : "Apply 1st day hours to all"}
          </button>
          <button
            type="button"
            onClick={handlePreset247}
            className="cursor-pointer rounded-[6px] border border-revix-border bg-revix-white px-2.5 py-1 text-[11.5px] font-medium text-revix-dark transition-colors hover:border-revix-primary hover:bg-revix-tint hover:text-revix-primary"
          >
            {isRtl ? "24/7 كل الأيام" : "24/7 All days"}
          </button>
        </div>
      </div>

      <div className="divide-y divide-revix-border rounded-control border border-revix-border bg-revix-white">
        {schedule.map((item) => {
          const meta = WEEKDAYS.find((w) => w.key === item.day)!;
          return (
            <div
              key={item.day}
              className={`flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 transition-colors ${
                item.open ? "bg-revix-white" : "bg-revix-surface/65"
              }`}
            >
              {/* Day toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={item.open}
                onClick={() => handleToggleDay(item.day)}
                className="flex min-w-[140px] cursor-pointer items-center gap-2.5 text-start"
              >
                <span
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    item.open ? "bg-revix-primary" : "bg-revix-border"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-revix-white transition-transform ${
                      item.open
                        ? isRtl
                          ? "-translate-x-4"
                          : "translate-x-4"
                        : isRtl
                          ? "-translate-x-1"
                          : "translate-x-1"
                    }`}
                  />
                </span>
                <span
                  className={`text-[13.5px] font-semibold ${
                    item.open ? "text-revix-dark" : "text-revix-secondary"
                  }`}
                >
                  {isRtl ? meta.ar : meta.en}
                </span>
              </button>

              {/* Time selectors or Closed pill */}
              {item.open ? (
                <div dir="ltr" className="flex items-center gap-2">
                  <div className="w-[102px]">
                    <RevixSelect
                      size="sm"
                      searchable={false}
                      value={item.start}
                      onChange={(e) =>
                        handleTimeChange(item.day, "start", e.target.value)
                      }
                      options={TIME_SLOT_OPTIONS}
                      aria-label={`${meta.en} start time`}
                      className="tabular-nums"
                      buttonClassName="font-medium text-[13px] tracking-tight"
                      menuClassName="tabular-nums text-[13px]"
                    />
                  </div>

                  <span className="text-[12px] font-medium text-revix-secondary">
                    →
                  </span>

                  <div className="w-[102px]">
                    <RevixSelect
                      size="sm"
                      searchable={false}
                      value={item.end}
                      onChange={(e) =>
                        handleTimeChange(item.day, "end", e.target.value)
                      }
                      options={TIME_SLOT_OPTIONS}
                      aria-label={`${meta.en} end time`}
                      className="tabular-nums"
                      buttonClassName="font-medium text-[13px] tracking-tight"
                      menuClassName="tabular-nums text-[13px]"
                    />
                  </div>
                </div>
              ) : (
                <span className="rounded-full border border-revix-border bg-revix-white px-2.5 py-0.5 text-[11.5px] font-medium text-revix-secondary">
                  {isRtl ? "مغلق (إجازة)" : "Closed"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
