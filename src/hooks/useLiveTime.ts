import { useState, useEffect } from "react";
import { format } from "date-fns";

export function useLiveTime(formatStr: string = "HH:mm 'UTC'") {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    // Initial update to avoid hydration mismatch if needed, or just set right away
    setTimeStr(format(new Date(), formatStr));
    
    const interval = setInterval(() => {
      setTimeStr(format(new Date(), formatStr));
    }, 1000);

    return () => clearInterval(interval);
  }, [formatStr]);

  return timeStr;
}
