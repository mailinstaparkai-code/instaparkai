export function vehicleImageSrc(vehicleType: string): string {
  const t = vehicleType.toLowerCase();
  if (t.includes("bike") || t.includes("motor")) return "/img/vehicles/bike.png";
  if (t.includes("scoot")) return "/img/vehicles/scooter.png";
  if (t.includes("sedan") || t.includes("4")) return "/img/vehicles/sedan.png";
  return "/img/vehicles/car.png";
}
