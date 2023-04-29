<script>
  import { Line } from "svelte-chartjs";
  import { getRelativePosition } from "chart.js/helpers";

  import { Chart as ChartJS, Title, LineElement, LinearScale, PointElement, Interaction } from "chart.js";
  import annotationPlugin from "chartjs-plugin-annotation";

  import { characters } from "./data";

  import { toLbs, feetFromMeters, toFeetLabel, toMeters, toMetersLabel, toCentimetersLabel } from "./weight";

  ChartJS.register(Title, LineElement, PointElement, LinearScale, annotationPlugin);

  // @ts-ignore
  Interaction.modes.cmInteractionMode = function (chart, event) {
    const position = getRelativePosition(event, chart);

    let dist = Infinity;
    let nearestItem;
    Interaction.evaluateInteractionItems(chart, "xy", position, (element, datasetIndex, index) => {
      const candidateDist = Math.sqrt((element.x - position.x) ** 2 + (element.y - position.y) ** 2);
      if (candidateDist < dist) {
        dist = candidateDist;
        nearestItem = { element, datasetIndex, index };
      }
    });
    return [nearestItem];
  };

  const createBMIThresholdAnnotation = (threshold) => ({
    type: "line",
    yMin: threshold,
    yMax: threshold,
    drawTime: "beforeDatasetsDraw",
    borderWidth: 1.2,
    borderDash: [6, 6],
    borderDashOffset: 0,
  });

  const possibleValuesToPlot = ["lbs", "kg", "BMI", "height (imp)", "height (metric)", "wish effectiveness", "100% effective wish (imp)", "100% effective wish (metric)", "uneffective wish (BMI)"];
  $: valueToPlot = possibleValuesToPlot[0];

  const characterNames = Object.entries(characters).map(([name]) => name);

  let selectedCharacters = [...characterNames];

  $: dataFromSelectedCharacters = Object.entries(characters).filter(([name]) => selectedCharacters.includes(name));

  $: selectedWeighings = dataFromSelectedCharacters.map(([name, data]) => ({name, ...data}));

  $: getWeighingInfo = (datasetIndex, index) => {
    return {
      character: selectedWeighings[datasetIndex],
      ...selectedWeighings[datasetIndex].weighingsByStep[index],
    };
  };

  const maxDay = (() => {
    let maxDay = 0;

    for (const characterName in characters) {
      for (const day in characters[characterName].weighingsByStep) {
        const parsedDay = parseInt(day);
        if (parsedDay > maxDay) {
          maxDay = parsedDay;
        }
      }
    }

    return maxDay;
  })();

  const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0;

  function toDataset(data, valueFunc) {
    return data.map(([name, data]) => ({
      label: name,
      borderColor: data.color,
      pointBackgroundColor: data.color,
      pointHoverBackgroundColor: data.color,
      pointBorderWidth: isTouchDevice ? 8 : 4,
      pointHoverBorderWidth: isTouchDevice ? 4 : 2,
      pointStyle: "crossRot",
      tension: 0.2,
      fill: false,
      data: Object.entries(data.weighingsByStep).map(([day, weighing]) => {
        const y = valueFunc(weighing);
        if (!y && y !== 0) {
          return null
        }
        return { x: day, y: y }
      }).filter(a => a !== null),
    }));
  }

  $: allDataLines = {
    kg: {
      datasets: toDataset(dataFromSelectedCharacters, ({ weight }) => weight),
    },
    lbs: {
      datasets: toDataset(dataFromSelectedCharacters, ({ weightInLbs }) => weightInLbs),
    },
    BMI: {
      datasets: toDataset(dataFromSelectedCharacters, ({ bmi }) => bmi),
    },
    'height (imp)': {
      datasets: toDataset(dataFromSelectedCharacters, ({ height }) => height),
    },
    'height (metric)': {
      datasets: toDataset(dataFromSelectedCharacters, ({ height }) => height),
    },
    'wish effectiveness': {
      datasets: toDataset(dataFromSelectedCharacters, ({ heightGainedToWeightGainedPercentage }) => heightGainedToWeightGainedPercentage),
    },
    '100% effective wish (imp)': {
      datasets: toDataset(dataFromSelectedCharacters, ({ initialHeightNormalizedToCurrentWeight }) => initialHeightNormalizedToCurrentWeight),
    },
    '100% effective wish (metric)': {
      datasets: toDataset(dataFromSelectedCharacters, ({ initialHeightNormalizedToCurrentWeight }) => initialHeightNormalizedToCurrentWeight),
    },
    'uneffective wish (BMI)': {
      datasets: toDataset(dataFromSelectedCharacters, ({ bmiIfCurrentWeightForInitialHeight }) => bmiIfCurrentWeightForInitialHeight),
    },
  };

  $: dataLine = allDataLines[valueToPlot];

  $: chartTitle = `Bex "Taller" Chart (${{
    "height (imp)": "height, imperial units",
    "height (metric)": "height, metric system",
    "100% effective wish (imp)": "100% effective wish, imperial units",
    "100% effective wish (metric)": "100% effective wish, metric system",
    "uneffective wish (BMI)": "uneffective wish, bmi",
  }[valueToPlot] || valueToPlot})`;

  let onClick = (event, _, chart) => {
    const elements = chart.getElementsAtEventForMode(event, "cmInteractionMode", { intersect: true }, true);
    lastSelected = getWeighingInfo(elements[0].datasetIndex, elements[0].index);
  };

  $: options = {
    responsive: true,
    aspectRatio: 16 / 9,
    legend: {
      display: false,
    },
    tooltips: {
      enabled: false,
    },
    animation: false,
    scales: {
      x: {
        type: "linear",
        bounds: "ticks",
        ticks: {
          max: maxDay + 1,
          min: 0,
          stepSize: 1,
          callback: (label) => (label % 1 === 0 ? `step ${label}` : ""),
        },
      },
      y: {
        type: "linear",
        bounds: "ticks",
        suggestedMax: {
          kg: 150,
          lbs: toLbs(150),
          BMI: 50,
          'wish effectiveness': 100,
        }[valueToPlot],
        suggestedMin: 0,
        ticks: {
          min: 0,
          stepSize: {
            kg: 10,
            lbs: 25,
            BMI: 5,
            'height (imp)': toMeters(1),
            'height (metric)': 0.25,
            'wish effectiveness': 10,
            '100% effective wish (imp)': toMeters(2),
            '100% effective wish (metric)': 0.5,
            'uneffective wish (BMI)': 5,
          }[valueToPlot],
          callback: (label) => {
            switch (valueToPlot) {
              case "kg":
                return label % 20 === 0 ? `${label}kg` : "";
              case "lbs":
                return label % 50 === 0 ? `${label}lbs` : "";
              case "height (imp)":
                return toFeetLabel(feetFromMeters(label));
              case "height (metric)":
                return toMetersLabel(label);
              case "wish effectiveness":
                return label % 20 === 0 ? `${label}%` : "";
              case "100% effective wish (imp)":
                return toFeetLabel(feetFromMeters(label));
              case "100% effective wish (metric)":
                return toMetersLabel(label);
              case "uneffective wish (BMI)":
              default:
                return label;
            }
          },
        },
      },
    },
    plugins: {
      annotation: {
        BMI: {
          annotations: {
            healthy: createBMIThresholdAnnotation(18.5),
            overweight: createBMIThresholdAnnotation(25),
            obese: createBMIThresholdAnnotation(30),
            obeseII: createBMIThresholdAnnotation(40),
          },
        },
        'uneffective wish (BMI)': {
          annotations: {
            healthy: createBMIThresholdAnnotation(18.5),
            overweight: createBMIThresholdAnnotation(25),
            obese: createBMIThresholdAnnotation(30),
            obeseII: createBMIThresholdAnnotation(40),
          },
        },
      }[valueToPlot],
    },
    onClick: onClick,
  };

  $: lastSelected = null;

  const toText = (lastSelected, valueToPlot) => {
    if (lastSelected === null) {
      return "Select a point on the chart to display more information";
    }

    let text = "";
    switch (valueToPlot) {
    case "kg":
      text += `At step ${lastSelected.day}, ${lastSelected.character.name} weighs ${lastSelected.weight} kg.`;
      if (!lastSelected.isInitial) {
        const weightDifference = lastSelected.weightGained;
        if (!weightDifference) {
          return text;
        }
        text += ` She ${weightDifference > 0 ? 'gained' : 'lost'} ${Math.abs(weightDifference)} kg in the last `;
        const dayDifference = lastSelected.daysSincePrevious;
        text += dayDifference > 1 ? `${dayDifference} steps` : `step`;
        if (!lastSelected.isSecond) {
          const totalWeightDifference = lastSelected.totalWeightGained;
          text += ` (total: ${totalWeightDifference} kg)`;
        }
        text += ".";
      }
      return text;
    case "lbs":
      text += `At step ${lastSelected.day}, ${lastSelected.character.name} weighs ${lastSelected.weightInLbs} lbs.`;
      if (!lastSelected.isInitial) {
        const weightDifference = lastSelected.weightGainedInLbs;
        if (!weightDifference) {
          return text;
        }
        text += ` She ${weightDifference > 0 ? 'gained' : 'lost'} ${Math.abs(weightDifference)} lbs in the last `;
        const dayDifference = lastSelected.daysSincePrevious;
        text += dayDifference > 1 ? `${dayDifference} steps` : `step`;
        if (!lastSelected.isSecond) {
          const totalWeightDifference = lastSelected.totalWeightGainedInLbs;
          text += ` (total: ${totalWeightDifference} lbs)`;
        }
        text += ".";
      }
      return text;
    case "BMI":
      text += `At step ${lastSelected.day}, ${lastSelected.character.name} `;

      if (!lastSelected.isInitial && lastSelected.bmiGained === 0) {
        text += "still ";
      }

      text += `has a BMI of ${lastSelected.bmi}, `;
      if (lastSelected.isInitial) {
        text += `so she is ${lastSelected.bmiCategory}.`;
      } else if (lastSelected.changedBMICategory) {
        text += `and is now ${lastSelected.bmiCategory}.`;
      } else {
        text += `and remains ${lastSelected.bmiCategory}.`;
      }

      if (!lastSelected.isInitial && lastSelected.bmiGained === 0) {
        const BMIDifference = lastSelected.bmiGained;
        text += ` She gained ${BMIDifference} BMI point${BMIDifference === 1 ? "" : "s"} in the last `;
        const dayDifference = lastSelected.daysSincePrevious;
        text += dayDifference > 1 ? `${dayDifference} steps.` : `step.`;
      }
      return text;
    case "height (imp)":
      text += `At step ${lastSelected.day}, ${lastSelected.character.name} is ${toFeetLabel(feetFromMeters(lastSelected.height))} tall.`;
      if (!lastSelected.isInitial) {
        const heightDifference = lastSelected.heightGained;
        if (!heightDifference) {
          return text;
        }
        text += ` She grew ${toFeetLabel(feetFromMeters(heightDifference))} in the last `;
        const dayDifference = lastSelected.daysSincePrevious;
        text += dayDifference > 1 ? `${dayDifference} steps` : `step`;
        if (!lastSelected.isSecond) {
          const totalHeightDifference = lastSelected.totalHeightGained;
          text += ` (total: ${toFeetLabel(feetFromMeters(totalHeightDifference))})`;
        }
        text += ".";
      }
      return text;
    case "height (metric)":
      text += `At step ${lastSelected.day}, ${lastSelected.character.name} is ${toMetersLabel(lastSelected.height)} tall.`;
      if (!lastSelected.isInitial) {
        const heightDifference = lastSelected.heightGained;
        if (!heightDifference) {
          return text;
        }
        text += ` She grew ${toCentimetersLabel(heightDifference)} in the last `;
        const dayDifference = lastSelected.daysSincePrevious;
        text += dayDifference > 1 ? `${dayDifference} steps` : `step`;
        if (!lastSelected.isSecond) {
          const totalHeightDifference = lastSelected.totalHeightGained;
          text += ` (total: ${toMetersLabel(totalHeightDifference)})`;
        }
        text += ".";
      }
      return text;
    case "wish effectiveness":
      if (lastSelected.isInitial) {
        return `At the beginning, ${lastSelected.character.name}'s wish hasn't had any effect yet. What could go wrong?`
      }
      return `At step ${lastSelected.day}, only ${lastSelected.heightGainedToWeightGainedPercentage}% of the weight ${lastSelected.character.name} gained has actually made her taller. She doesn't seem to mind that much.`
    case '100% effective wish (imp)':
      if (lastSelected.isInitial) {
        return `At the beginning, ${lastSelected.character.name}'s wish hasn't had any effect yet. What could go wrong?`
      }
      return `At step ${lastSelected.day}, if 100% of the weight ${lastSelected.character.name} has gained went to make her taller, she'd be ${toFeetLabel(feetFromMeters(lastSelected.initialHeightNormalizedToCurrentWeight))} tall (rather than ${toFeetLabel(feetFromMeters(lastSelected.height))}).`;
    case '100% effective wish (metric)': 
      if (lastSelected.isInitial) {
        return `At the beginning, ${lastSelected.character.name}'s wish hasn't had any effect yet. What could go wrong?`
      }
      return `At step ${lastSelected.day}, if 100% of the weight ${lastSelected.character.name} has gained went to make her taller, she'd be ${toMetersLabel(lastSelected.initialHeightNormalizedToCurrentWeight)} tall (rather than ${toMetersLabel(lastSelected.height)}).`;
    case 'uneffective wish (BMI)': 
      if (lastSelected.isInitial) {
        return `At the beginning, ${lastSelected.character.name}'s wish hasn't had any effect yet. What could go wrong?`
      }
      return `At step ${lastSelected.day}, if none of the weight ${lastSelected.character.name} has gained went to make her taller, she'd have a BMI of ${lastSelected.bmiIfCurrentWeightForInitialHeight} (rather than ${lastSelected.bmi}) and she'd be ${lastSelected.bmiCategoryIfCurrentWeightForInitialHeight}.`
    }
  };

  const toPageUrl = (lastSelected) => {
    if (!lastSelected) {
      return "";
    }
    return lastSelected.url;
  };
</script>

<main>
  <div class="cm-container">
    <h1>{chartTitle}</h1>
    <div class="cm-chart">
      <Line data={dataLine} {options} />
    </div>

    <form class="cm-select-value">
      {#each possibleValuesToPlot as possibleValueToPlot}
        <label class="cm-value-label">
          <input class="cm-value-radio" type="radio" bind:group={valueToPlot} value={possibleValueToPlot} />
          {possibleValueToPlot}
        </label>
      {/each}
    </form>

    <p>
      {toText(lastSelected, valueToPlot)}
    </p>
    {#if toPageUrl(lastSelected)}
      <p>
        <a href={toPageUrl(lastSelected)}>Go to page</a>
      </p>
    {/if}
  </div>

  <div class="cm-genies-head">
    <img src="./genie.png" alt="Genie" width="170" height="142" />
  </div>
  <footer>
    <p>
      <a href="https://linktr.ee/ebcart">Linktree: make Bex grow!</a>
    </p>

    <p>
      <a href="https://picarto.tv/EBCArt">Watch EBC stream on Picarto</a>
    </p>
    
    <p>
      <a href="https://www.patreon.com/extrabaggageclaim">Support EBC on Patreon</a>
    </p>

    <p>
      <a href="https://www.deviantart.com/extrabaggageclaim/gallery"
        >EBC's Deviantart gallery</a
      >
    </p>

    <p>
      <a href="https://github.com/Phatelot/EBCDriveChart">Source code of this page</a
      >
    </p>

    <p>All characters belong to ExtraBaggageClaim.</p>
  </footer>
</main>

<style>
  h1 {
    text-align: center;
    color: rgb(65, 65, 65);
  }

  footer p {
    margin-left: 4px;
    margin-right: 4px;
    text-align: center;
  }

  img {
    max-width: 174px;
  }

  .cm-genies-head {
    display: flex;
    flex-flow: row-reverse;
    pointer-events: none;
  }

  .cm-container {
    padding-left: 18px;
    padding-right: 18px;
    flex-grow: 1;
  }

  @media only screen and (min-width: 768px) and (max-width: 1000px) {
    .cm-container {
      padding-left: 120px;
      padding-right: 120px;
      margin-bottom: -96px;
    }
  }

  @media only screen and (min-width: 1001px) and (max-width: 1300px) {
    .cm-container {
      padding-left: 120px;
      padding-right: 120px;
      margin-bottom: -96px;
    }
  }

  @media only screen and (min-width: 1301px) {
    .cm-container {
      padding-left: 120px;
      padding-right: 120px;
      margin-bottom: -96px;
    }
  }

  .cm-chart {
    background-color: white;
    position: relative;
    margin: auto;
    aspect-ratio: 16/9;
    max-height: 65vh;
  }

  .cm-select-char {
    justify-content: center;
    display: flex;
    flex-wrap: wrap;
  }

  .cm-char-label {
    padding: 5px;
    border: none;
    border-radius: 5px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    margin: 4px 2px;
  }

  .cm-select-value {
    justify-content: center;
    display: flex;
    flex-wrap: wrap;
  }

  .cm-char-checkbox {
    display: none;
  }

  .cm-value-label {
    padding: 5px;
    border-radius: 5px;
    border-width: 1px;
    text-align: center;
    border: solid;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    margin: 4px 2px;
  }

  .cm-value-radio {
    display: none;
  }
</style>
