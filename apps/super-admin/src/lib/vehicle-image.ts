export function vehicleImageSrc(vehicleType: string): string {
  const t = vehicleType.toLowerCase();
  if (t.includes("bike") || t.includes("motor")) return "/img/vehicles/bike.jpg";
  if (t.includes("scoot")) return "/img/vehicles/bike.jpg";
  if (t.includes("sedan") || t.includes("4")) return "/img/vehicles/car.jpg";
  return "/img/vehicles/car.jpg";
}
