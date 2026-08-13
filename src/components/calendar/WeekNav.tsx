import { startOfWeek, addDays } from "./WeeklyCalendar";
import Button from "../ui/Button";
import { ChevronLeft, ChevronRight } from "../../icons";
import styles from "./WeekNav.module.css";

interface Props {
  /** Any date within the currently-shown week. */
  weekOf: Date;
  onChange: (weekOf: Date) => void;
  weekStartsOn?: 0 | 1;
}

function fmtRange(start: Date, end: Date): string {
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  const startStr = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endStr = sameMonth
    ? end.toLocaleDateString(undefined, { day: "numeric", year: "numeric" })
    : end.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  return `${startStr} – ${endStr}`;
}

/** Prev/next/"This Week" navigation for the schedule calendars. Pure — the
 *  caller owns the `weekOf` date and re-derives its own event window from it. */
export default function WeekNav({ weekOf, onChange, weekStartsOn = 0 }: Props) {
  const start = startOfWeek(weekOf, weekStartsOn);
  const end = addDays(start, 6);

  return (
    <div className={styles.nav}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(addDays(weekOf, -7))}
        aria-label="Previous week"
      >
        <ChevronLeft />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange(new Date())}
      >
        This Week
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(addDays(weekOf, 7))}
        aria-label="Next week"
      >
        <ChevronRight />
      </Button>
      <span className={styles.range}>{fmtRange(start, end)}</span>
    </div>
  );
}
