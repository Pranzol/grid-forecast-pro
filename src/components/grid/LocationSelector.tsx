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
  "Andaman and Nicobar Islands": ["Port Blair", "Nicobar", "North and Middle Andaman", "South Andaman"],
  "Andhra Pradesh": [
    "Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool",
    "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari"
  ],
  "Arunachal Pradesh": ["Itanagar", "Tawang", "Ziro", "Pasighat", "Along", "Tezu"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tinsukia"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga"],
  "Chandigarh": ["Chandigarh"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Delhi": [
    "Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi",
    "North West Delhi", "Shahdara", "South Delhi", "South East Delhi",
    "South West Delhi", "West Delhi"
  ],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  "Gujarat": [
    "Ahmedabad", "Amreli", "Anand", "Banaskantha", "Bharuch", "Bhavnagar",
    "Gandhinagar", "Jamnagar", "Junagadh", "Kutch", "Mehsana", "Morbi",
    "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot",
    "Sabarkantha", "Surat", "Surendranagar", "Vadodara", "Valsad"
  ],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar", "Rohtak"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Solan", "Mandi", "Hamirpur"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Udhampur"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh"],
  "Karnataka": [
    "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban",
    "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga",
    "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri",
    "Hubballi", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mangaluru",
    "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Shivajinagara", "Tumakuru",
    "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"
  ],
  "Kerala": [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam",
    "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta",
    "Thiruvananthapuram", "Thrissur", "Wayanad"
  ],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior", "Jabalpur", "Ujjain", "Sagar"],
  "Maharashtra": [
    "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara",
    "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli",
    "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban",
    "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar",
    "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg",
    "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
  ],
  "Manipur": ["Imphal", "Thoubal", "Churachandpur"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner"],
  "Sikkim": ["Gangtok", "Namchi", "Geyzing"],
  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
    "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Kanyakumari", "Karur",
    "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal",
    "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet",
    "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi",
    "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur",
    "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"
  ],
  "Telangana": [
    "Adilabad", "Asifabad", "Bellampally", "Bhadradri Kothagudem", "Bhupalpally",
    "Godavarikhani", "Hanumakonda", "Husnabad", "Hyderabad", "Jagtial",
    "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy",
    "Karimnagar", "Khammam", "Korutla", "Kothagudem", "Kumuram Bheem Asifabad",
    "Mahabubabad", "Mahabubnagar", "Mancherial", "Mandamarri", "Medak",
    "Medchal-Malkajgiri", "Metpally", "Mulugu", "Nagarkurnool", "Nalgonda",
    "Narayanpet", "Nirmal", "Nizamabad", "Paloncha", "Peddapalli",
    "Rajanna Sircilla", "Ramagundam", "Rangareddy", "Sangareddy", "Sathupally",
    "Siddipet", "Sircilla", "Suryapet", "Vemulawada", "Vikarabad", "Wanaparthy",
    "Warangal", "Yadadri Bhuvanagiri", "Yellandu"
  ],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Noida", "Prayagraj", "Ghaziabad", "Meerut"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Haldwani", "Roorkee", "Rudrapur"],
  "West Bengal": ["Kolkata", "Darjeeling", "Siliguri", "Asansol", "Durgapur", "Howrah"]
};

// Alphabetical sort for States
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
