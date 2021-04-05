<script>
  import { onMount, afterUpdate, onDestroy } from "svelte";
  import { clean } from "./utils";

  import Chart from "chart.js";

  export let data = {
    labels: [],
    datasets: [{ values: [] }],
    yMarkers: {},
    yRegions: [],
  };
  export let type = "line";
  export let options = {};
  export let plugins = {};
  let chart = null;
  let chartRef;
  let props = clean($$props, ["data", "type", "options", "plugins"]);
  onMount(() => {
    chart = new Chart(chartRef, {
      type,
      data,
      options,
      plugins,
    });
  });
  afterUpdate(() => {
    if (!chart) {
      return;
    }
    chart.data = data;
    chart.type = type;
    chart.options = options;
    chart.plugins = plugins;
    chart.update();
  });

  onDestroy(() => {
    chart = null;
  });

  export let clickPointHandler = () => {};

  const clickHandler = (event) => {
    if (chart == null) {
      return;
    }
    const activePoint = chart.getElementAtEvent(event);
    clickPointHandler(activePoint);
  };
</script>

<canvas bind:this={chartRef} {...props} on:click={clickHandler} />
