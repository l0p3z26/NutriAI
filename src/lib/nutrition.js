// ═══════════════════════════════════════════════════════
// CÁLCULO NUTRICIONAL
// ═══════════════════════════════════════════════════════
const MULT_ACTIVIDAD = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, very_high: 1.9,
};

// Edad (años cumplidos) a partir de una fecha ISO "YYYY-MM-DD". La fecha de
// nacimiento se guarda solo en el dispositivo; aquí derivamos la edad, que se
// recalcula sola con el paso del tiempo (p. ej. el día del cumpleaños).
export function edadDesdeFecha(fechaISO) {
  if (!fechaISO) return null;
  const d = new Date(`${fechaISO}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const hoy = new Date();
  let e = hoy.getFullYear() - d.getFullYear();
  const m = hoy.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < d.getDate())) e--;
  return e;
}

export function calcBMR({ sex, weightKg: w, heightCm: h, age }) {
  const base = 10 * w + 6.25 * h - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calcTDEE(p) { return calcBMR(p) * MULT_ACTIVIDAD[p.activityLevel]; }

export function calcTargets(p) {
  const tdee = calcTDEE(p);

  const ajuste = {
    lose_fat:    { conservative: -250, normal: -400, aggressive: -600 },
    maintain:    { conservative: 0,    normal: 0,    aggressive: 0    },
    gain_muscle: { conservative: 150,  normal: 300,  aggressive: 500  },
    gain_weight: { conservative: 300,  normal: 500,  aggressive: 700  },
    performance: { conservative: 150,  normal: 225,  aggressive: 300  },
    custom:      { conservative: 0,    normal: 0,    aggressive: 0    },
  }[p.goal]?.[p.targetSpeed] ?? 0;

  const caloriesKcal = Math.max(1200, Math.round(tdee + ajuste));
  const lowWarn = caloriesKcal <= 1200;

  // Proteina g/kg * peso * 4 kcal/g
  const proteinG = Math.round(p.weightKg * ({
    lose_fat: 2.1, maintain: 1.8, gain_muscle: 2.0,
    gain_weight: 1.6, performance: 1.9, custom: 1.8,
  }[p.goal] ?? 1.8));

  // Grasa g/kg * peso * 9 kcal/g - varia por objetivo
  const fatG = Math.round(p.weightKg * ({
    lose_fat: 0.7, maintain: 0.8, gain_muscle: 0.8,
    gain_weight: 1.0, performance: 0.7, custom: 0.8,
  }[p.goal] ?? 0.8));

  // Carbos: (kcal_totales - proteina*4 - grasa*9) / 4 kcal/g
  const carbohydratesG = Math.max(0, Math.round((caloriesKcal - proteinG * 4 - fatG * 9) / 4));

  return { caloriesKcal, proteinG, carbohydratesG, fatG, lowWarn };
}

export function calcConsumido(comidas) {
  return comidas.reduce((a, m) => ({
    caloriesKcal:   a.caloriesKcal   + (m.caloriesKcal   || 0),
    proteinG:       a.proteinG       + (m.proteinG       || 0),
    carbohydratesG: a.carbohydratesG + (m.carbohydratesG || 0),
    fatG:           a.fatG           + (m.fatG           || 0),
  }), { caloriesKcal: 0, proteinG: 0, carbohydratesG: 0, fatG: 0 });
}
