import { BMIToCategory, toInches } from "./weight";
import { BMI } from "./weight";
import { fromLbs, toMeters, toLbs } from "./weight";

export const characters = completeData({
  Bex: {
    color: "#483465",
    weighingsByStep: {
      0: {
        url: "https://twitter.com/EBCArtWork/status/1646336098170466304/photo/2",
        height: toMeters(4, 10),
        weight: fromLbs(90),
      },
      1: {
        url: "https://twitter.com/EBCArtWork/status/1646336098170466304/photo/3",
        height: toMeters(5, 4),
        weight: fromLbs(119),
      },
      2: {
        url: "https://twitter.com/EBCArtWork/status/1646336098170466304/photo/4",
        height: toMeters(6, 0),
        weight: fromLbs(172),
      },
      3: {
        url: "https://twitter.com/EBCArtWork/status/1646671962759106560/photo/1",
        height: toMeters(7, 0),
        weight: fromLbs(261),
      },
      4: {
        url: "https://twitter.com/EBCArtWork/status/1649228306745802753/photo/1",
        height: toMeters(8, 0),
        weight: fromLbs(372),
      },
      5: {
        url: "https://twitter.com/EBCArtWork/status/1650655470036856832/photo/1",
        height: toMeters(9, 0),
        weight: fromLbs(513),
      },
      6: {
        height: toMeters(10, 0),
        url: "https://twitter.com/EBCArtWork/status/1651754414900920321/photo/1",
        weight: fromLbs(703),
      },
      7: {
        height: toMeters(10, 10),
        url: "https://twitter.com/EBCArtWork/status/1657109797483970561/photo/1",
        weight: fromLbs(851),
      },
      8: {
        height: toMeters(11, 11),
        // url: "https://twitter.com/EBCArtWork/status/1657109797483970561/photo/1",
        weight: fromLbs(1130),
      },
    },
  },
});

function completeData(characters) {
  for (const character in characters) {
    characters[character] = completeCharacterData(characters[character]);
  }
  return characters;
}

function completeCharacterData(character) {
  const weighingDates = Object.keys(character.weighingsByStep).map(d => parseInt(d)).sort().map(d => `${d}`);
  const initialWeighing = character.weighingsByStep[weighingDates[0]];
  initialWeighing.height = initialWeighing.height || character.height;
  character.weighingsByStep[weighingDates[0]] = completeWeighingData(null, null, initialWeighing, weighingDates);

  for (let i = 1; i < weighingDates.length; i++) {
    const previousWeighingDate = weighingDates[i - 1];
    const weighingDate = weighingDates[i];
    character.weighingsByStep[weighingDate] = completeWeighingData(
      character.weighingsByStep[weighingDates[0]],
      character.weighingsByStep[previousWeighingDate],
      character.weighingsByStep[weighingDate],
      weighingDate,
    );
  }

  return character;
}

function completeWeighingData(initialWeighing, previousWeighing, weighing, day) {
  const height = weighing.height || initialWeighing.height;
  const bmi = BMI(weighing.height, weighing.weight);
  weighing = {
    ...weighing,
    day: parseInt(day),
    isInitial: !previousWeighing,
    isSecond: previousWeighing && initialWeighing === previousWeighing,
    height,
    bmi,
    bmiCategory: BMIToCategory(bmi),
  };

  weighing = {
    ...weighing,
    initialWeightNormalizedToCurrentHeight: function() {
      // If the character started at their current height while maintaining their BMI, how much would they have weighed?
      return weighing.isInitial ? weighing.weight : initialWeighing.bmi * weighing.height * weighing.height;      
    }(),
    currentWeightNormalizedToInitialHeight: function() {
      // If the character's height didn't change since the beginning, how much would they have to weigh to get to their current BMI?
      return weighing.isInitial ? weighing.weight : weighing.bmi * initialWeighing.height * initialWeighing.height;
    }(),
    initialHeightNormalizedToCurrentWeight: function() {
      // If the character maintained their current weight, how tall would they have to be to get to their initial BMI?
      return weighing.isInitial ? weighing.height : Math.sqrt(weighing.weight / initialWeighing.bmi);
    }(),
    currentHeightNormalizedToInitialWeight: function() {
      // If the character's weight didn't change since the beginning, how small would they have to be to get to their current BMI?
      return weighing.isInitial ? weighing.height : Math.sqrt(initialWeighing.weight / weighing.bmi);
    }(),
  };

  weighing = {
    ...weighing, 
    weightGained: previousWeighing ? (weighing.weight - previousWeighing.weight) : 0,
    heightGained: previousWeighing ? (weighing.height - previousWeighing.height) : 0,
    bmiGained: previousWeighing ? (weighing.bmi - previousWeighing.bmi) : 0,
    changedBMICategory: previousWeighing && (previousWeighing.bmiCategory !== weighing.bmiCategory),
    daysSincePrevious: previousWeighing ? (weighing.day - previousWeighing.day) : 0,
    totalWeightGained: initialWeighing ? (weighing.weight - initialWeighing.weight) : 0,
    totalHeightGained: initialWeighing ? (weighing.height - initialWeighing.height) : 0,
    daysSinceInitial: initialWeighing ? (weighing.day - initialWeighing.day) : 0,
    weightGainedNormalizedToInitialHeight: function() {
      // If the character's height didn't change since the beginning, how much would they have to gain to get to their current BMI ?
      if (weighing.isInitial) {
        return 0;
      }
      return weighing.currentWeightNormalizedToInitialHeight - initialWeighing.weight; 
    }(),
    excessFat: function() {
      // If the character's height had always been the current one but their BMI progression would be their actual one, how much weight would they have put on total?
      if (weighing.isInitial) {
        return 0;
      }
      return weighing.weight - weighing.initialWeightNormalizedToCurrentHeight;
    }(),
    bmiIfCurrentWeightForInitialHeight: function() {
      // BMI if the character's weight would be the current one while they'd have been maintaining their initial height?
      if (weighing.isInitial) {
        return weighing.bmi;
      }
      return BMI(initialWeighing.height, weighing.weight);
    }(),
  };

  weighing.bmiCategoryIfCurrentWeightForInitialHeight = BMIToCategory(weighing.bmiIfCurrentWeightForInitialHeight);

  weighing.heightGainedToWeightGainedPercentage = function() {
    // How much of the gained weight made the character taller rather than fatter?
    if (weighing.isInitial) {
      return 100;
    }

    return 100 - 100*(weighing.excessFat / weighing.totalWeightGained);
  }();
  
  weighing = {
    ...weighing,
    weightGainedInLbs: toLbs(weighing.weightGained),
    weightInLbs: toLbs(weighing.weight),
    totalWeightGainedInLbs: toLbs(weighing.totalWeightGained),
    weightGainedNormalizedToCurrentHeightInLbs: toLbs(weighing.weightGainedNormalizedToCurrentHeight),
    weightGainedNormalizedToInitialHeightInLbs: toLbs(weighing.weightGainedNormalizedToInitialHeight),
    heightInInches: toInches(weighing.height),
    heightGainedInInches: toInches(weighing.heightGained),
    totalHeightGainedInInches: toInches(weighing.totalHeightGained),
  };

  roundProperty(weighing, 'heightGainedToWeightGainedPercentage', 1);
  [
    'weightGained',
    'totalWeightGained',
    'weightGainedNormalizedToCurrentHeight',
    'weightGainedNormalizedToInitialHeight',
  ].forEach(propertyName => roundProperty(weighing, propertyName, 1));
  [
    'heightGained',
    'totalHeightGained',
  ].forEach(propertyName => roundProperty(weighing, propertyName, 2));

  return weighing;
}

function roundProperty(object, propertyName, digits) {
  object[propertyName] = Math.round(object[propertyName] * Math.pow(10, digits)) / Math.pow(10, digits);
}
