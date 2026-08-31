"use client";

import { ChipMultiSelect, Stepper, TextArea, Toggle } from "@/components/ui";
import type { Report, Settings } from "@/lib/types";

/**
 * シフト・人員体制。
 *
 * このアプリで一番大事なのがここ。社員が居ない日にどれだけ回せたかを
 * 後から比べられるように、社員在店とアルバイトのみの時間帯は必ず答えさせる。
 */
export function ShiftSection({
  report,
  settings,
  patch,
}: {
  report: Report;
  settings: Settings;
  patch: (fn: (r: Report) => Report) => void;
}) {
  const s = report.shift;
  const set = <K extends keyof Report["shift"]>(key: K, v: Report["shift"][K]) =>
    patch((r) => ({ ...r, shift: { ...r.shift, [key]: v } }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-soft">出勤人数</span>
        <Stepper value={s.headcount} onChange={(v) => set("headcount", v)} label="出勤人数" max={30} />
      </div>

      <div
        className={`rounded-2xl border-2 p-3 ${
          s.staffPresent
            ? "border-info bg-info-bg"
            : "border-[color:var(--color-warn)] bg-warn-bg"
        }`}
      >
        <Toggle
          label="社員は在店していましたか"
          value={s.staffPresent}
          onChange={(v) => set("staffPresent", v)}
          yes="社員あり"
          no="社員なし"
          tone="loud"
        />
        <p className="mt-1 text-xs font-bold text-ink-soft">
          {s.staffPresent
            ? "社員が入っていた日として集計します"
            : "アルバイトのみで回した日として、履歴でハイライトされます"}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-soft">製造担当者（複数選択）</p>
        <ChipMultiSelect
          options={settings.staff}
          value={s.production}
          onChange={(v) => set("production", v)}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-soft">販売担当者（複数選択）</p>
        <ChipMultiSelect options={settings.staff} value={s.sales} onChange={(v) => set("sales", v)} />
      </div>

      <Toggle
        label="アルバイトのみの時間帯はありましたか"
        value={s.partOnly}
        onChange={(v) => set("partOnly", v)}
      />

      {s.partOnly ? (
        <div className="rounded-2xl bg-cream-deep p-3">
          <TextArea
            label="その時間帯"
            rows={1}
            placeholder="例：14時〜17時"
            value={s.partOnlyHours}
            onChange={(v) => set("partOnlyHours", v)}
          />
          <TextArea
            label="対応状況（困ったこと・回せたこと）"
            placeholder="例：製造は追いつかなかったが、販売は待たせずに回せた"
            value={s.partOnlyNote}
            onChange={(v) => set("partOnlyNote", v)}
          />
        </div>
      ) : null}
    </div>
  );
}
