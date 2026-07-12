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

export type ParkingSpace = {
  id: string;
  name: string;
  type: "corporate" | "commercial" | "industrial" | "hybrid";
  address: string | null;
  timezone: string;
  zones: Zone[];
};

export type Organization = {
  id: string;
  name: string;
  parking_spaces: ParkingSpace[];
};
