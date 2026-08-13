import { addDays } from "./WeeklyCalendar";
import Button from "../ui/Button";
import { ChevronLeft, ChevronRight } from "../../icons";
import styles from "./WeekNav.module.css";

interface Props {
  /** The day currently being shown. */
  date: Date;
  onChange: (date: Date) => void;
  /** Optional trailing note, e.g. the store's hours for that day. */
  note?: string;
}

/** Prev/next/"Today" navigation for DailyCalendar. Shares WeekNav's styling so
 *  the two views read as one control. */
export default function DayNav({ date, onChange, note }: Props) {
  return (
    <div className={styles.nav}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(addDays(date, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange(new Date())}
      >
        Today
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(addDays(date, 1))}
        aria-label="Next day"
      >
        <ChevronRight />
      </Button>
      <span className={styles.range}>
        {date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
        {note ? ` · ${note}` : ""}
      </span>
    </div>
  );
}
