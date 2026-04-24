import * as React from "react";
import { Check, ChevronsUpDown, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Dataset mapping States to Areas (including districts and local areas)
const STATE_AREAS_DATA: Record<string, string[]> = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Visakhapatnam"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "South Delhi", "West Delhi"],
  "Gujarat": ["Ahmedabad", "Gandhinagar", "Rajkot", "Surat", "Vadodara"],
  "Karnataka": ["Bengaluru Rural", "Bengaluru Urban", "Hubballi", "Mangaluru", "Mysuru", "Shivajinagara", "Tumakuru"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Thiruvananthapuram"],
  "Maharashtra": ["Mumbai", "Nagpur", "Nashik", "Pune", "Thane"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  "Telangana": ["Adilabad", "Hyderabad", "Khammam", "Nizamabad", "Warangal"],
};

export const STATES = Object.keys(STATE_AREAS_DATA).sort();

interface LocationSelectorProps {
  stateValue: string;
  areaValue: string;
  onStateChange: (state: string) => void;
  onAreaChange: (area: string) => void;
}

export function LocationSelector({
  stateValue,
  areaValue,
  onStateChange,
  onAreaChange,
}: LocationSelectorProps) {
  const [openState, setOpenState] = React.useState(false);
  const [openArea, setOpenArea] = React.useState(false);

  // Ensure areas are sorted alphabetically
  const areas = stateValue ? [...STATE_AREAS_DATA[stateValue]].sort() : [];

  return (
    <div className="flex flex-col gap-3">
      <Popover open={openState} onOpenChange={setOpenState}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={openState}
            className="w-full justify-between bg-input/50 border-border hover:bg-input transition-smooth"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {stateValue || "Select state..."}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border" align="start">
          <Command>
            <CommandInput placeholder="Search state..." className="h-10" />
            <CommandList>
              <CommandEmpty>No state found.</CommandEmpty>
              <CommandGroup>
                {STATES.map((s) => (
                  <CommandItem
                    key={s}
                    value={s}
                    onSelect={(currentValue) => {
                      const matched = STATES.find(
                        (st) => st.toLowerCase() === currentValue.toLowerCase(),
                      );
                      onStateChange(matched ?? s);
                      setOpenState(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        stateValue === s ? "opacity-100 text-primary" : "opacity-0",
                      )}
                    />
                    {s}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover open={openArea} onOpenChange={setOpenArea}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={openArea}
            disabled={!stateValue}
            className="w-full justify-between bg-input/50 border-border hover:bg-input transition-smooth"
          >
            <span className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              {areaValue || "Select area..."}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border" align="start">
          <Command>
            <CommandInput placeholder="Search area..." className="h-10" />
            <CommandList>
              <CommandEmpty>No area found.</CommandEmpty>
              <CommandGroup>
                {areas.map((a) => (
                  <CommandItem
                    key={a}
                    value={a}
                    onSelect={(currentValue) => {
                      const matched = areas.find(
                        (ar) => ar.toLowerCase() === currentValue.toLowerCase(),
                      );
                      onAreaChange(matched ?? a);
                      setOpenArea(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        areaValue === a ? "opacity-100 text-primary" : "opacity-0",
                      )}
                    />
                    {a}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
