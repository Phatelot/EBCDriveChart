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
  return "extremely obese";
}

export function toLbs(weight) {
  return Math.round(weight / 0.453);
}
