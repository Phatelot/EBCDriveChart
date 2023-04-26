<script>
  import { Line } from "svelte-chartjs";
  import { getRelativePosition } from "chart.js/helpers";

  import { Chart as ChartJS, Title, LineElement, LinearScale, PointElement, Interaction } from "chart.js";
  import annotationPlugin from "chartjs-plugin-annotation";

  import { characters } from "./data";

  import { BMI, BMIToCategory, toLbs, feetFromMeters, toFeetLabel, toMeters, toMetersLabel, toCentimetersLabel } from "./weight";

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

  const possibleValuesToPlot = ["lbs", "kg", "BMI", "height (imp)", "height (metric)"];
  $: valueToPlot = possibleValuesToPlot[0];

  const characterNames = Object.entries(characters).map(([name]) => name);
  const characterColors = Object.fromEntries(characterNames.map((name) => [name, characters[name].color]));

  let selectedCharacters = [...characterNames];

  $: dataFromSelectedCharacters = Object.entries(characters).filter(([name]) => selectedCharacters.includes(name));

  $: selectedWeighings = dataFromSelectedCharacters.map(([name, data]) => ({
    name,
    ...data,
    weighings: Object.entries(data.weighingsByStep).map(([day, weighing]) => ({
      day,
      weighing,
    })),
  }));

  $: getWeighingInfo = (datasetIndex, index) => {
    return {
      character: selectedWeighings[datasetIndex],
      ...selectedWeighings[datasetIndex].weighings[index],
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
        const y = valueFunc({
          height: weighing.height || data.height,
          weight: weighing.weight,
          initialWeight: (data.weighingsByStep[0] || {}).weight,
        });
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
      datasets: toDataset(dataFromSelectedCharacters, ({ weight }) => toLbs(weight)),
    },
    BMI: {
      datasets: toDataset(dataFromSelectedCharacters, ({ weight, height }) => BMI(height, weight)),
    },
    'height (imp)': {
      datasets: toDataset(dataFromSelectedCharacters, ({ height }) => height),
    },
    'height (metric)': {
      datasets: toDataset(dataFromSelectedCharacters, ({ height }) => height),
    },
  };

  $: dataLine = allDataLines[valueToPlot];

  $: chartTitle = `Bex "Taller" Chart (${{
    "height (imp)": "height, imperial units",
    "height (metric)": "height, metric system",
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
      }[valueToPlot],
    },
    onClick: onClick,
  };

  $: lastSelected = null;

  const toText = (lastSelected, valueToPlot) => {
    if (lastSelected === null) {
      return "Select a point on the chart to display more information";
    }

    let previousWeighingsFromLastSelected = Object.entries(lastSelected.character.weighingsByStep)
      .filter(([day]) => parseInt(day) < lastSelected.day)
      .filter(([_, weighing]) => !!weighing.weight)
      .sort(([day1], [day2]) => parseInt(day2) - parseInt(day1))[0];

    let firstWeighingsFromLastSelected = Object.entries(lastSelected.character.weighingsByStep)
      .filter(([day]) => parseInt(day) < lastSelected.day)
      .filter(([_, weighing]) => !!weighing.weight)
      .sort(([day1], [day2]) => parseInt(day1) - parseInt(day2))[0];

    const atLeastSecondWeighing =
      !!firstWeighingsFromLastSelected &&
      firstWeighingsFromLastSelected[0] !== lastSelected.day &&
      firstWeighingsFromLastSelected[0] !== previousWeighingsFromLastSelected[0];

    if (valueToPlot === "kg") {
      let text = `At step ${lastSelected.day}, ${lastSelected.character.name} weighs ${lastSelected.weighing.weight} kg.`;
      if (!!previousWeighingsFromLastSelected) {
        const weightDifference =
          Math.round((lastSelected.weighing.weight - previousWeighingsFromLastSelected[1].weight) * 10) / 10;
        if (!weightDifference) {
          return text;
        }
        text += ` She ${weightDifference > 0 ? 'gained' : 'lost'} ${Math.abs(weightDifference)} kg in the last `;
        const dayDifference = lastSelected.day - previousWeighingsFromLastSelected[0];
        text += dayDifference > 1 ? `${dayDifference} steps` : `step`;
        if (atLeastSecondWeighing) {
          const totalWeightDifference =
            Math.round((lastSelected.weighing.weight - firstWeighingsFromLastSelected[1].weight) * 10) / 10;
          const totalDayDifference = lastSelected.day - firstWeighingsFromLastSelected[0];
          text += ` (total: ${totalWeightDifference} kg)`;
        }
        text += ".";
      }
      return text;
    }
    if (valueToPlot === "lbs") {
      let text = `At step ${lastSelected.day}, ${lastSelected.character.name} weighs ${toLbs(
        lastSelected.weighing.weight
      )} lbs.`;
      if (!!previousWeighingsFromLastSelected) {
        const weightDifference =
          Math.round(toLbs(lastSelected.weighing.weight - previousWeighingsFromLastSelected[1].weight) * 10) / 10;
        if (!weightDifference) {
          return text;
        }
        text += ` She ${weightDifference > 0 ? 'gained' : 'lost'} ${Math.abs(weightDifference)} lbs in the last `;
        const dayDifference = lastSelected.day - previousWeighingsFromLastSelected[0];
        text += dayDifference > 1 ? `${dayDifference} steps` : `step`;
        if (atLeastSecondWeighing) {
          const totalWeightDifference =
            Math.round((lastSelected.weighing.weight - firstWeighingsFromLastSelected[1].weight) * 10) / 10;
          const totalDayDifference = lastSelected.day - firstWeighingsFromLastSelected[0];
          text += ` (total: ${toLbs(totalWeightDifference)} lbs)`;
        }
        text += ".";
      }
      return text;
    }
    if (valueToPlot === "BMI") {
      const lastBMI = BMI(
        lastSelected.weighing.height || lastSelected.character.height,
        lastSelected.weighing.weight
      );
      const previousBMI = !!previousWeighingsFromLastSelected
        ? BMI(
            previousWeighingsFromLastSelected[1].height || lastSelected.character.height,
            previousWeighingsFromLastSelected[1].weight
          )
        : null;

      let text = `At step ${lastSelected.day}, ${lastSelected.character.name} `;

      if (previousBMI === lastBMI) {
        text += "still ";
      }

      text += `has a BMI of ${lastBMI}, `;
      const lastBMICategory = BMIToCategory(lastBMI);
      if (!previousBMI) {
        text += `so she is ${lastBMICategory}.`;
      } else if (BMIToCategory(previousBMI) !== lastBMICategory) {
        text += `and is now ${lastBMICategory}.`;
      } else {
        text += `and remains ${lastBMICategory}.`;
      }

      if (previousBMI && previousBMI !== lastBMI) {
        const BMIDifference = lastBMI - previousBMI;
        text += ` She gained ${BMIDifference} BMI point${BMIDifference === 1 ? "" : "s"} in the last `;
        const dayDifference = lastSelected.day - previousWeighingsFromLastSelected[0];
        text += dayDifference > 1 ? `${dayDifference} steps.` : `day.`;
      }
      return text;
    }
    if (valueToPlot === "height (imp)") {
      let text = `At step ${lastSelected.day}, ${lastSelected.character.name} is ${toFeetLabel(feetFromMeters(lastSelected.weighing.height))} tall.`;
      if (!!previousWeighingsFromLastSelected) {
        const heightDifference = lastSelected.weighing.height - previousWeighingsFromLastSelected[1].height;
        if (!heightDifference) {
          return text;
        }
        text += ` She grew ${toFeetLabel(feetFromMeters(heightDifference))} in the last `;
        const dayDifference = lastSelected.day - previousWeighingsFromLastSelected[0];
        text += dayDifference > 1 ? `${dayDifference} steps` : `step`;
        if (atLeastSecondWeighing) {
          const totalHeightDifference = lastSelected.weighing.height - firstWeighingsFromLastSelected[1].height;
          const totalDayDifference = lastSelected.day - firstWeighingsFromLastSelected[0];
          text += ` (total: ${toFeetLabel(feetFromMeters(totalHeightDifference))})`;
        }
        text += ".";
      }
      return text;
    }
    if (valueToPlot === "height (metric)") {
      let text = `At step ${lastSelected.day}, ${lastSelected.character.name} is ${toMetersLabel(lastSelected.weighing.height)} tall.`;
      if (!!previousWeighingsFromLastSelected) {
        const heightDifference = lastSelected.weighing.height - previousWeighingsFromLastSelected[1].height;
        if (!heightDifference) {
          return text;
        }
        text += ` She grew ${toCentimetersLabel(heightDifference)} in the last `;
        const dayDifference = lastSelected.day - previousWeighingsFromLastSelected[0];
        text += dayDifference > 1 ? `${dayDifference} steps` : `step`;
        if (atLeastSecondWeighing) {
          const totalHeightDifference = lastSelected.weighing.height - firstWeighingsFromLastSelected[1].height;
          const totalDayDifference = lastSelected.day - firstWeighingsFromLastSelected[0];
          text += ` (total: ${toMetersLabel(totalHeightDifference)})`;
        }
        text += ".";
      }
      return text;
    }
  };

  const toPageUrl = (lastSelected) => {
    if (!lastSelected) {
      return "";
    }
    return lastSelected.weighing.url;
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
