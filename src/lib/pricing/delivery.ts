export interface DeliveryRateData {
  zone: number;
  maxWeightKg: number;
  price: number;
}

export interface DeliveryPoint {
  copies: number;
  zone: number;
  hayon: boolean;
}

export interface DeliveryConfig {
  rates: DeliveryRateData[];
  hayonSurcharge: number;
}

export interface DeliveryPointResult {
  weightKg: number;
  basePrice: number;
  hayonCost: number;
  total: number;
}

function findDeliveryRate(rates: DeliveryRateData[], zone: number, weightKg: number): number {
  const zoneRates = rates
    .filter(r => r.zone === zone)
    .sort((a, b) => a.maxWeightKg - b.maxWeightKg);

  for (const rate of zoneRates) {
    if (weightKg <= rate.maxWeightKg) return rate.price;
  }

  // Over max weight: use highest tier rate x ceiling(weight/100)
  const topRate = zoneRates[zoneRates.length - 1];
  if (topRate) {
    return topRate.price * Math.ceil(weightKg / 100);
  }
  return 0;
}

export function calcDeliveryCost(
  points: DeliveryPoint[],
  weightPerCopyGrams: number,
  config: DeliveryConfig
): { points: DeliveryPointResult[]; total: number } {
  const results: DeliveryPointResult[] = points.map(p => {
    const weightKg = Math.max(1, (p.copies * weightPerCopyGrams) / 1000);
    const basePrice = findDeliveryRate(config.rates, p.zone, weightKg);
    const hayonCost = p.hayon ? config.hayonSurcharge : 0;
    return { weightKg, basePrice, hayonCost, total: basePrice + hayonCost };
  });
  const total = results.reduce((s, r) => s + r.total, 0);
  return { points: results, total };
}
