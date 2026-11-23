import { describe, expect, it } from "vitest";
import { calculateQuote, couponProblem, refundFor, type Coupon, type PricingContext } from "@/lib/booking/pricing";

const base: PricingContext = {
  today: "2027-01-10",
  property: {
    baseNightlyRate: 30000,
    baseGuests: 4,
    maxGuests: 6,
    extraGuestFee: 5000,
    defaultMinNights: 2,
    weekendNights: [5, 6],
    minAdvanceDays: 1,
    maxAdvanceDays: 450,
    paymentMode: "deposit",
    depositPercent: 30,
    balanceDueDays: 14,
  },
  seasons: [
    { name: "Előszezon", startDate: "2027-05-01", endDate: "2027-06-19", nightlyRate: 38000, weekendRate: 44000, minNights: 2, priority: 0 },
    { name: "Főszezon", startDate: "2027-06-20", endDate: "2027-08-23", nightlyRate: 62000, weekendRate: 68000, minNights: 5, priority: 10 },
    { name: "Augusztusi csúcs", startDate: "2027-08-01", endDate: "2027-08-15", nightlyRate: 70000, weekendRate: null, minNights: 7, priority: 20 },
  ],
  overrides: [{ date: "2027-08-20", nightlyRate: 75000, minNights: null, label: "Ünnep" }],
  fees: [
    { name: "Takarítás", kind: "per_stay", amount: 25000 },
    { name: "Ágynemű", kind: "per_night", amount: 1000 },
  ],
};

const req = (checkIn: string, checkOut: string, adults = 2, children = 0, couponCode: string | null = null) => ({
  checkIn, checkOut, adults, children, couponCode,
});

function ok(r: ReturnType<typeof calculateQuote>) {
  if (!r.ok) throw new Error(`Várt sikeres ajánlat, kapott: ${r.error}`);
  return r.quote;
}

describe("éjszakadíjak", () => {
  it("alapárat használ szezonon kívül", () => {
    // 2027-03-01 hétfő, 2 éjszaka (hétfő, kedd)
    const q = ok(calculateQuote(base, req("2027-03-01", "2027-03-03")));
    expect(q.nightly.map((n) => n.rate)).toEqual([30000, 30000]);
    expect(q.nightly.every((n) => n.source === "base")).toBe(true);
  });

  it("szezonális és hétvégi árat alkalmaz (péntek és szombat éjszaka)", () => {
    // 2027-05-06 csütörtök → csüt, pén, szo éjszakák
    const q = ok(calculateQuote(base, req("2027-05-06", "2027-05-09")));
    expect(q.nightly.map((n) => n.rate)).toEqual([38000, 44000, 44000]);
    expect(q.nightly.map((n) => n.weekend)).toEqual([false, true, true]);
    expect(q.accommodation).toBe(126000);
  });

  it("szezonváltáskor éjszakánként a megfelelő szezont használja", () => {
    // 06-17 (csüt) .. 06-22 → 06-17, 06-18 előszezon; 06-19 (szo) előszezon hétvége; 06-20, 06-21 főszezon
    const ctx = { ...base, seasons: base.seasons.map((s) => ({ ...s, minNights: 2 })) };
    const q = ok(calculateQuote(ctx, req("2027-06-17", "2027-06-22")));
    expect(q.nightly.map((n) => n.label)).toEqual(["Előszezon", "Előszezon", "Előszezon", "Főszezon", "Főszezon"]);
    expect(q.nightly.map((n) => n.rate)).toEqual([38000, 44000, 44000, 62000, 62000]);
  });

  it("magasabb prioritású szezon felülírja az átfedő szezont", () => {
    const q = ok(calculateQuote(base, req("2027-08-02", "2027-08-09")));
    expect(q.nightly.every((n) => n.label === "Augusztusi csúcs" && n.rate === 70000)).toBe(true);
  });

  it("az egyedi napidíj (ünnep) elsőbbséget élvez", () => {
    const q = ok(calculateQuote(base, req("2027-08-18", "2027-08-23")));
    const aug20 = q.nightly.find((n) => n.date === "2027-08-20")!;
    expect(aug20.rate).toBe(75000);
    expect(aug20.source).toBe("override");
  });
});

describe("szabályok", () => {
  it("érvényesíti a szezon minimum éjszakaszámát az érkezés napja szerint", () => {
    const r = calculateQuote(base, req("2027-07-05", "2027-07-08"));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("min_nights");
      expect(r.minNights).toBe(5);
    }
    expect(calculateQuote(base, req("2027-07-05", "2027-07-10")).ok).toBe(true);
  });

  it("alap minimum éjszakaszám szezonon kívül", () => {
    const r = calculateQuote(base, req("2027-03-01", "2027-03-02"));
    expect(r.ok).toBe(false);
  });

  it("elutasítja a túl sok vendéget és a hibás dátumokat", () => {
    expect(calculateQuote(base, req("2027-03-01", "2027-03-04", 5, 2))).toMatchObject({ ok: false, error: "too_many_guests" });
    expect(calculateQuote(base, req("2027-03-04", "2027-03-01"))).toMatchObject({ ok: false, error: "checkout_before_checkin" });
    expect(calculateQuote(base, req("2027-02-30", "2027-03-02"))).toMatchObject({ ok: false, error: "invalid_dates" });
    expect(calculateQuote(base, req("2027-03-01", "2027-03-04", 0, 2))).toMatchObject({ ok: false, error: "invalid_guests" });
  });

  it("foglalási előidő: túl korai és túl távoli érkezés", () => {
    expect(calculateQuote(base, req("2027-01-10", "2027-01-13"))).toMatchObject({ ok: false, error: "too_soon" });
    expect(calculateQuote(base, req("2028-06-01", "2028-06-04"))).toMatchObject({ ok: false, error: "too_far" });
  });

  it("admin felülbírálással a minimum éjszakaszám és előidő nem kötelező", () => {
    const r = calculateQuote(base, req("2027-07-05", "2027-07-06"), null, { ignoreBookingRules: true });
    expect(r.ok).toBe(true);
  });
});

describe("díjak, extra vendég, végösszeg", () => {
  it("extra vendég díj a base_guests felett, éjszakánként", () => {
    const q = ok(calculateQuote(base, req("2027-03-01", "2027-03-04", 4, 2)));
    expect(q.extraGuests).toEqual({ count: 2, perNight: 5000, amount: 30000 });
  });

  it("további költségek: tartózkodásonként és éjszakánként", () => {
    const q = ok(calculateQuote(base, req("2027-03-01", "2027-03-04")));
    expect(q.fees).toEqual([{ name: "Takarítás", amount: 25000 }, { name: "Ágynemű", amount: 3000 }]);
    expect(q.total).toBe(90000 + 25000 + 3000);
  });

  it("vendég-éjszakánkénti díj", () => {
    const ctx = { ...base, fees: [{ name: "IFA", kind: "per_guest_night" as const, amount: 500 }] };
    const q = ok(calculateQuote(ctx, req("2027-03-01", "2027-03-04", 2, 1)));
    expect(q.fees[0].amount).toBe(500 * 3 * 3);
  });
});

describe("kuponok", () => {
  const coupon: Coupon = {
    code: "NYAR10", kind: "percent", value: 10, validFrom: "2027-05-01", validTo: "2027-09-30",
    minNights: 3, maxUses: 5, usedCount: 0, active: true,
  };

  it("százalékos kedvezmény csak a szállásdíjra vonatkozik", () => {
    const q = ok(calculateQuote(base, req("2027-05-03", "2027-05-06", 2, 0, "nyar10"), coupon));
    // 3 × 38000 = 114000 → 10% = 11400; takarítás + ágynemű nem kedvezményes
    expect(q.discount).toEqual({ code: "NYAR10", amount: 11400 });
    expect(q.total).toBe(114000 - 11400 + 25000 + 3000);
  });

  it("fix összegű kedvezmény nem lehet nagyobb a szállásdíjnál", () => {
    const fixed: Coupon = { ...coupon, kind: "fixed", value: 1_000_000, minNights: null };
    const q = ok(calculateQuote(base, req("2027-05-03", "2027-05-06", 2, 0, "X"), fixed));
    expect(q.discount!.amount).toBe(114000);
  });

  it("érvénytelen kupon: hibaüzenet, az ajánlat kedvezmény nélkül érvényes marad", () => {
    const q = ok(calculateQuote(base, req("2027-03-01", "2027-03-04", 2, 0, "NYAR10"), coupon));
    expect(q.discount).toBeNull();
    expect(q.couponError).toMatch(/nem érvényes/);
    expect(ok(calculateQuote(base, req("2027-03-01", "2027-03-04", 2, 0, "NINCS"), null)).couponError).toMatch(/Ismeretlen/);
  });

  it("kupon feltételei: min. éjszaka, felhasználási limit, inaktív", () => {
    expect(couponProblem(coupon, "2027-05-03", 2)).toMatch(/legalább 3/);
    expect(couponProblem({ ...coupon, usedCount: 5 }, "2027-05-03", 3)).toMatch(/felhasznál/);
    expect(couponProblem({ ...coupon, active: false }, "2027-05-03", 3)).toMatch(/inaktív/);
    expect(couponProblem(coupon, "2027-05-03", 3)).toBeNull();
  });
});

describe("előleg és fizetés", () => {
  it("30% előleg, a hátralék 14 nappal érkezés előtt esedékes", () => {
    const q = ok(calculateQuote(base, req("2027-03-01", "2027-03-04")));
    expect(q.deposit).toBe(Math.round(q.total * 0.3));
    expect(q.balance).toBe(q.total - q.deposit);
    expect(q.balanceDueDate).toBe("2027-02-15");
  });

  it("ha az érkezés a hátralék-határidőn belül van, teljes összeg fizetendő", () => {
    const q = ok(calculateQuote(base, req("2027-01-20", "2027-01-23")));
    expect(q.deposit).toBe(q.total);
    expect(q.balance).toBe(0);
    expect(q.balanceDueDate).toBeNull();
  });

  it("teljes fizetés módban nincs előleg", () => {
    const ctx = { ...base, property: { ...base.property, paymentMode: "full" as const } };
    const q = ok(calculateQuote(ctx, req("2027-03-01", "2027-03-04")));
    expect(q.deposit).toBe(q.total);
  });
});

describe("lemondási szabályok", () => {
  const rules = [{ daysBefore: 30, refundPercent: 100 }, { daysBefore: 14, refundPercent: 50 }, { daysBefore: 0, refundPercent: 0 }];
  it("a lemondás időpontja szerinti visszatérítés", () => {
    expect(refundFor(rules, "2027-07-01", "2027-05-01", 100000)).toEqual({ percent: 100, amount: 100000 });
    expect(refundFor(rules, "2027-07-01", "2027-06-10", 100000)).toEqual({ percent: 50, amount: 50000 });
    expect(refundFor(rules, "2027-07-01", "2027-06-25", 100000)).toEqual({ percent: 0, amount: 0 });
  });
});
