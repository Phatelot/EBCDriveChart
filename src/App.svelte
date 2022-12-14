<script>
  import Base from "./Base.svelte";
  import { characters } from "./data";

  import { BMI, BMIToCategory, toLbs, toStonesLabel } from "./weight";

  const possibleValuesToPlot = ["lbs", "kg", "lbs gained", "BMI"];
  $: valueToPlot = possibleValuesToPlot[0];

  const characterNames = Object.entries(characters).map(([name]) => name);
  const characterColors = Object.fromEntries(
    characterNames.map((name) => [name, characters[name].color])
  );

  let selectedCharacters = [...characterNames];

  $: dataFromSelectedCharacters = Object.entries(characters).filter(([name]) =>
    selectedCharacters.includes(name)
  );

  $: selectedWeighings = dataFromSelectedCharacters.map(([name, data]) => ({
    name,
    ...data,
    weighings: Object.entries(data.weighingsByDay).map(([day, weighing]) => ({
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
      for (const day in characters[characterName].weighingsByDay) {
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
      borderColor: data.color,
      tension: 0.2,
      fill: false,
      data: Object.entries(data.weighingsByDay).map(([day, weighing]) => ({
        x: day,
        y: valueFunc({
          height: weighing.height || data.height,
          weight: weighing.weight,
          initialWeight: (data.weighingsByDay[0] || {}).weight,
        }),
      })),
    }));
  }

  $: allDataLines = {
    kg: {
      datasets: toDataset(dataFromSelectedCharacters, ({ weight }) => weight),
    },
    lbs: {
      datasets: toDataset(dataFromSelectedCharacters, ({ weight }) =>
        toLbs(weight)
      ),
    },
    BMI: {
      datasets: toDataset(dataFromSelectedCharacters, ({ weight, height }) =>
        BMI(height, weight)
      ),
    },
    'lbs gained': {
      datasets: toDataset(dataFromSelectedCharacters, ({ weight, initialWeight }) =>
        toLbs(weight - initialWeight)
      ),
    },
  };

  $: dataLine = allDataLines[valueToPlot];

  $: options = {
    legend: {
      display: false,
    },
    tooltips: {
      enabled: false,
    },
    animation: false,
    scales: {
      xAxes: [
        {
          type: "linear",
          bounds: "ticks",
          ticks: {
            max: maxDay + 1,
            min: 0,
            stepSize: 1,
            callback: (label) => {
              if (label == maxDay + 1) {
                return ""
              } else if (label == 4) {
                return "start of last stream"
              } else if (label == 5) {
                return "end of last stream"
              }
              return `step ${label + 1}`
            },
          },
        },
      ],
      yAxes: [
        {
          type: "linear",
          bounds: "ticks",
          ticks: {
            suggestedMax: {
              kg: 100,
              lbs: toLbs(100),
              BMI: 50,
              'lbs gained': toLbs(100),
            }[valueToPlot],
            min: 0,
            stepSize: {
              kg: 50,
              lbs: 100,
              BMI: 5,
              'lbs gained': 100,
            }[valueToPlot],
            callback: (label) => {
              switch (valueToPlot) {
                case "kg":
                  return `${label}kg`;
                case "lbs":
                  return `${label}lbs`;
                case "lbs gained":
                  return `${label}lbs`;
                default:
                  return label;
              }
            },
          },
        },
      ],
    },
  };

  $: lastSelected = null;

  const toText = (lastSelected, valueToPlot) => {
    if (lastSelected === null) {
      return "Select a point on the chart to display more information";
    }

    let previousWeighingsFromLastSelected = Object.entries(
      lastSelected.character.weighingsByDay
    )
      .filter(([day]) => parseInt(day) < lastSelected.day)
      .filter(([_, weighing]) => !!weighing.weight)
      .sort(([day1], [day2]) => parseInt(day2) - parseInt(day1))[0];

    let firstWeighingsFromLastSelected = Object.entries(
      lastSelected.character.weighingsByDay
    )
      .filter(([day]) => parseInt(day) < lastSelected.day)
      .filter(([_, weighing]) => !!weighing.weight)
      .sort(([day1], [day2]) => parseInt(day1) - parseInt(day2))[0];

    const atLeastSecondWeighing = !!firstWeighingsFromLastSelected && (firstWeighingsFromLastSelected[0] !== lastSelected.day) && (firstWeighingsFromLastSelected[0] !== previousWeighingsFromLastSelected[0]);

    if (valueToPlot === "kg") {
      let text = `In part ${parseInt(lastSelected.day) + 1}, ${lastSelected.character.name} weighs ${lastSelected.weighing.weight} kg.`;
      if (!!previousWeighingsFromLastSelected) {
        const weightDifference =
          Math.round(
            (lastSelected.weighing.weight -
              previousWeighingsFromLastSelected[1].weight) *
              10
          ) / 10;
        text += ` She gained ${weightDifference} kg since the previous part `;
        if (atLeastSecondWeighing) {
          const totalWeightDifference = Math.round(
            (lastSelected.weighing.weight -
            firstWeighingsFromLastSelected[1].weight) * 10
          ) /10;
          const totalDayDifference = lastSelected.day - firstWeighingsFromLastSelected[0];
          text += ` (total: ${totalWeightDifference} kg)`
        }
        text += ".";
      }
      return text;
    }
    if (valueToPlot === "lbs") {
      let text = `In part ${parseInt(lastSelected.day) + 1}, ${
        lastSelected.character.name
      } weighs ${toLbs(lastSelected.weighing.weight)} lbs.`;
      if (!!previousWeighingsFromLastSelected) {
        const weightDifference =
          Math.round(
            toLbs(
              lastSelected.weighing.weight -
                previousWeighingsFromLastSelected[1].weight
            ) * 10
          ) / 10;
        text += ` She gained ${weightDifference} lbs since the previous part`;
        if (atLeastSecondWeighing) {
          const totalWeightDifference = Math.round(
            (lastSelected.weighing.weight -
            firstWeighingsFromLastSelected[1].weight) * 10
          ) /10;
          const totalDayDifference = lastSelected.day - firstWeighingsFromLastSelected[0];
          text += ` (total: ${toLbs(totalWeightDifference)} lbs)`
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

      let text = `In part ${parseInt(lastSelected.day) + 1}, ${lastSelected.character.name} `;

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
        text += ` She gained ${BMIDifference} BMI point${
          BMIDifference === 1 ? "" : "s"
        } since the previous part.`
      }

      if (lastSelected.character.name === "Shyla") {
        text += " Obviously, BMI doesn't make much sense for snakes."
      }

      return text;
    }
    if (valueToPlot === "lbs gained") {
      if (lastSelected.day === '0') {
        return "In part 1, the girls haven't gained any weight... yet."
      }

      const totalLbsGained = toLbs(lastSelected.weighing.weight - firstWeighingsFromLastSelected[1].weight)
      let text = `In part ${parseInt(lastSelected.day) + 1}, ${
        lastSelected.character.name
      } has gained a total of ${Math.round(totalLbsGained)} lbs.`
      return text;
    }
  };

  const toPageUrl = (lastSelected) => {
    if (!lastSelected) {
      return "";
    }
    return lastSelected.weighing.url;
  };

  let clickPointHandler = (event) => {
    if (!event) {
      return;
    }
    lastSelected = getWeighingInfo(event._datasetIndex, event._index);
  };
</script>

<main>
  <div class="cm-container">
    <h1>EBC Monster girls drive ({valueToPlot})</h1>
    <div class="cm-chart">
      <Base data={dataLine} {options} {clickPointHandler} />
    </div>

    <form class="cm-select-char">
      {#each characterNames as characterName}
        <label
          class="cm-char-label"
          style="background-color: {characterColors[characterName]}"
        >
          <input
            class="cm-char-checkbox"
            type="checkbox"
            bind:group={selectedCharacters}
            value={characterName}
          />
          {characterName}
        </label>
      {/each}
    </form>

    <form class="cm-select-value">
      {#each possibleValuesToPlot as possibleValueToPlot}
        <label class="cm-value-label">
          <input
            class="cm-value-radio"
            type="radio"
            bind:group={valueToPlot}
            value={possibleValueToPlot}
          />
          {possibleValueToPlot}
        </label>
      {/each}
    </form>

    {toText(lastSelected, valueToPlot)}
    {#if toPageUrl(lastSelected)}
      <p>
        <a href={toPageUrl(lastSelected)}>Go to page</a>
      </p>
    {/if}
  </div>

  <div class="cm-cassies-head">
    <img src="./cassie.png" alt="Cassie's head" width="200" height="200" />
  </div>
  <footer>
    <p>All characters belong to ExtraBaggageClaim.</p>

    <p>
      <a href="https://ko-fi.com/extrabagageclaim">Ko-fi: make the girls grow!</a>
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

  .cm-cassies-head {
    display: flex;
    flex-flow: row-reverse;
    pointer-events: none;
  }

  .cm-container {
    padding: 18px;
    flex-grow: 1;
  }

  @media only screen and (min-width: 768px) and (max-width: 1000px) {
    .cm-container {
      padding-left: 100px;
      padding-right: 100px;
    }
  }

  @media only screen and (min-width: 1001px) and (max-width: 1300px) {
    .cm-container {
      padding-left: 200px;
      padding-right: 200px;
      margin-bottom: -120px;
    }
  }

  @media only screen and (min-width: 1301px) {
    .cm-container {
      padding-left: 350px;
      padding-right: 350px;
      margin-bottom: -120px;
    }
  }

  .cm-chart {
    background-color: white;
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
