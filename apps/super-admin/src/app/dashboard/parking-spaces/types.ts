export type Slot = {
  id: string;
  slot_number: string;
  category: string;
  is_ev: boolean;
  is_disabled_slot: boolean;
  status: "available" | "occupied" | "reserved" | "out_of_service";
};

export type Zone = {
  id: string;
  name: string;
  slots: Slot[];
};

export type AccessMethod = "anpr" | "rfid" | "hid";

export type AccessWorkflow = {
  id: string;
  methods: AccessMethod[];
};

export type TariffRule = {
  id: string;
  vehicle_category: string;
  pricing_type: "flat" | "hourly" | "surge";
  rate: number;
  surge_multiplier: number | null;
};

export type ParkingAdmin = {
  id: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
};

export type ParkingSpace = {
  id: string;
  name: string;
  type: "corporate" | "commercial" | "industrial" | "hybrid";
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  valet_parking_enabled: boolean;
  zones: Zone[];
  // one-to-one relation (unique FK) -> PostgREST returns a single object or null, not an array
  access_workflows: AccessWorkflow | null;
  tariff_rules: TariffRule[];
};

export type Organization = {
  id: string;
  name: string;
  parking_spaces: ParkingSpace[];
};
