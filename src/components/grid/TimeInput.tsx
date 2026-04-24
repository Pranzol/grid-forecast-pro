import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeInputProps {
  /** "HH:mm" 24-hour string */
  value: string;
  onChange: (value: string) => void;
}

export function TimeInput({ value, onChange }: TimeInputProps) {
  const [hh, mm] = value.split(":");
  const hour24 = parseInt(hh ?? "13", 10);
  const minute = parseInt(mm ?? "0", 10);

  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;

  const update = (h12: number, m: number, p: "AM" | "PM") => {
    let h24 = h12 % 12;
    if (p === "PM") h24 += 12;
    onChange(
      `${h24.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
    );
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select
        value={hour12.toString()}
        onValueChange={(v) => update(parseInt(v, 10), minute, period)}
      >
        <SelectTrigger className="bg-input/50 border-border">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <SelectItem key={h} value={h.toString()}>
              {h.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={minute.toString()}
        onValueChange={(v) => update(hour12, parseInt(v, 10), period)}
      >
        <SelectTrigger className="bg-input/50 border-border">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {[0, 15, 30, 45].map((m) => (
            <SelectItem key={m} value={m.toString()}>
              {m.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={period}
        onValueChange={(v) => update(hour12, minute, v as "AM" | "PM")}
      >
        <SelectTrigger className="bg-input/50 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
