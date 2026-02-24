export interface DeliveryRateData {
  zone: number;
  maxWeightKg: number;
  price: number;
}

/** Per-department per-weight rate (XLSM Transports matrix). When set, overrides zone-based rate. */
export interface DepartmentRateData {
  departmentCode: string;
  maxWeightKg: number;
  price: number;
}

export interface DeliveryPoint {
  copies: number;
  zone: number;
  hayon: boolean;
  /** When set and departmentRates provided, use per-dept rate instead of zone */
  departmentCode?: string;
}

export interface DeliveryConfig {
  rates: DeliveryRateData[];
  hayonSurcharge: number;
  /** Optional: per-department per-weight (carrier-specific). Overrides zone when departmentCode on point is set. */
  departmentRates?: DepartmentRateData[];
}

export interface DeliveryPointResult {
  weightKg: number;
  basePrice: number;
  hayonCost: number;
  total: number;
}

function findDeliveryRateByZone(rates: DeliveryRateData[], zone: number, weightKg: number): number {
  const zoneRates = rates
    .filter(r => r.zone === zone)
    .sort((a, b) => a.maxWeightKg - b.maxWeightKg);

  for (const rate of zoneRates) {
    if (weightKg <= rate.maxWeightKg) return rate.price;
  }

  const topRate = zoneRates[zoneRates.length - 1];
  if (topRate) return topRate.price * Math.ceil(weightKg / 100);
  return 0;
}

function findDeliveryRateByDept(departmentRates: DepartmentRateData[], weightKg: number): number {
  const sorted = [...departmentRates].sort((a, b) => a.maxWeightKg - b.maxWeightKg);
  for (const r of sorted) {
    if (weightKg <= r.maxWeightKg) return r.price;
  }
  const top = sorted[sorted.length - 1];
  if (top) return top.price * Math.ceil(weightKg / 100);
  return 0;
}

export function calcDeliveryCost(
  points: DeliveryPoint[],
  weightPerCopyGrams: number,
  config: DeliveryConfig
): { points: DeliveryPointResult[]; total: number } {
  const deptRatesByCode = new Map<string, DepartmentRateData[]>();
  if (config.departmentRates?.length) {
    for (const r of config.departmentRates) {
      const list = deptRatesByCode.get(r.departmentCode) ?? [];
      list.push(r);
      deptRatesByCode.set(r.departmentCode, list);
    }
  }

  const results: DeliveryPointResult[] = points.map(p => {
    const weightKg = Math.max(1, (p.copies * weightPerCopyGrams) / 1000);
    let basePrice: number;
    if (p.departmentCode && deptRatesByCode.has(p.departmentCode)) {
      basePrice = findDeliveryRateByDept(deptRatesByCode.get(p.departmentCode)!, weightKg);
    } else {
      basePrice = findDeliveryRateByZone(config.rates, p.zone, weightKg);
    }
    const hayonCost = p.hayon ? config.hayonSurcharge : 0;
    return { weightKg, basePrice, hayonCost, total: basePrice + hayonCost };
  });
  const total = results.reduce((s, r) => s + r.total, 0);
  return { points: results, total };
}
