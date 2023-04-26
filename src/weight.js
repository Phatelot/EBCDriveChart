export function BMI(height, weight) {
  return Math.round(weight / (height * height));
}

export function BMIToCategory(bmi) {
  if (bmi < 18.5) {
    return "underweight";
  }
  if (bmi < 25) {
    return "healthy";
  }
  if (bmi < 30) {
    return "overweight";
  }
  if (bmi < 35) {
    return "obese";
  }
  if (bmi < 40) {
    return "severely obese";
  }
  if (bmi < 50) {
    return "morbidly obese";
  }
  return "extremely obese";
}

export function toLbs(weight) {
  return Math.round(weight / 0.453);
}

export function fromLbs(weight) {
  return Math.round(weight * 0.453 * 10) / 10;
}

const POUNDS_IN_A_STONE = 14;

export function toStonesLabel(weightInLbs) {
  if (weightInLbs < POUNDS_IN_A_STONE) {
    return `${weightInLbs}lbs`;
  }
  const stones = Math.floor(weightInLbs / POUNDS_IN_A_STONE);
  const lbs = weightInLbs % POUNDS_IN_A_STONE;
  let label = `${stones}st`;
  if (lbs) {
    label += ` ${lbs}lbs`;
  }
  return label;
}

export function toMeters(feet, inches) {
  return (feet * 12 + inches) * 0.0254;
}

export function feetFromMeters(meters) {
  const inches = Math.round(meters / 0.0254);
  return {
    feet: Math.floor(inches / 12),
    inches: inches % 12,
  };
}

export function toFeetLabel({feet, inches}) {
  let label = "";
  if (feet) {
    label += `${feet}'`
  }
  if (inches) {
    label += `${inches}"`
  }
  return label;
}

export function toMetersLabel(height) {
  return `${Math.round(height * 100) / 100}m`
}

export function toCentimetersLabel(height) {
  return `${Math.round(height * 100)}cm`
}