import { Looker, VisualizationDefinition } from "../common/types";
import { handleErrors, rounder } from "../common/utils";

import * as Highcharts from "highcharts";
// Load module after Highcharts is loaded
require("highcharts/modules/sunburst")(Highcharts);

declare var looker: Looker;
let chartOptions: any;
chartOptions = {
  chart: {
    type: "sunburst",
    plotBorderWidth: 0,
    plotBorderColor: "#ffffff",
  },
  credits: {
    enabled: false,
  },
  title: {
    floating: true,
    text: "",
  },
  legend: {
    align: "right",
    layout: "vertical",
    margin: 10,
    y: 25,
    verticalAlign: "top",
    symbolHeight: 280,
  },
  series: [],
  plotOptions: {
    series: {
      states: {
        hover: {
          enabled: false,
          halo: null,
        },
        select: {
          halo: null,
        },
      },
    },
  },
  tooltip: {
    headerFormat: "",
    pointFormat:
      "<b>{point.name}</b> has <b>{point.value}</b> employees with <b>{point.percent}%</b> compliance",
  },
};
let baseChartOptions = chartOptions;

interface SunburstViz extends VisualizationDefinition {
  elementRef?: HTMLDivElement;
}

const vis: SunburstViz = {
  id: "custom-sumburst", // id/label not required, but nice for testing and keeping manifests in sync
  label: "custom-sunburst",
  options: {},
  // Set up the initial state of the visualization
  create(element, config) {
    element.innerHTML = "Rendering ...";
    // chart = Highcharts.stockChart(element, chartOptions)
  },
  // Render in response to the data or settings changing
  async updateAsync(data, element, config, queryResponse, details, done) {
    element.innerHTML = "";

    const errors = handleErrors(this, queryResponse, {
      max_pivots: 0,
      min_dimensions: 2,
      max_dimensions: 4,
      min_measures: 1,
      max_measures: 2,
    });

    let measures = queryResponse.fields.measure_like.map((field) => {
      let key = field.label;
      let value = field.name;
      return { [key]: value };
    });

    // These are the looker viz options.
    let options = this.options;

    options["numerator"] = {
      section: "Values",
      type: "string",
      label: "Numerator Measure",
      display: "select",
      values: measures,
      order: 1,
    };
    options["denominator"] = {
      section: "Values",
      type: "string",
      label: "Denominator Measure",
      display: "select",
      values: measures,
      order: 1,
    };

    options["minColor"] = {
      section: "Colors",
      type: "array",
      label: "Minimum Value Color",
      display: "color",
      default: "#263279",
      order: 3,
    };
    options["midColor"] = {
      section: "Colors",
      type: "array",
      label: "Median Value Color",
      display: "color",
      default: "#D9DDDE",
      order: 4,
    };
    options["maxColor"] = {
      section: "Colors",
      type: "array",
      label: "Maximum Value Color",
      display: "color",
      default: "#670D23",
      order: 5,
    };

    this.trigger("registerOptions", options); // register options with parent page to update visConfig

    // end if the denominator and numerator are not configured.
    if (!config.denominator || !config.numerator) {
      element.innerHTML = `Please specify a Numerator and Denominator in the Viz Config`;
      done();
      return;
    }

    let seriesData: Array<any> = [];
    let dimensionNames: Array<string> = queryResponse.fields.dimension_like.map(
      (x) => x.name
    );
    let dimCount: number = dimensionNames.length;
    let lastDimension: string = dimensionNames[dimCount - 1];
    let ancestorsAdded: Array<string> = [];

    // Loop through each data point.
    data.forEach(function (row, i) {
      // Find the default numerator and denominator.
      var denominator: number = parseInt(row[config.denominator].value);
      var numerator: number = parseInt(row[config.numerator].value);

      // Start a code block so we can break out if the denominator is funny
      addToArray: {
        if (!denominator || isNaN(denominator) || denominator === 0)
          break addToArray;

        // Loop through all the dimensions for this row
        dimensionNames.forEach((dimName, i) => {
          // get the pertinent dimension names
          let dims = dimensionNames.slice(0, i + 1);
          // look up the values for those dimensions, and concat them.
          let id = dims.map((dim) => row[dim].value).toString();
          // do the same for the parent, if there is one.
          let parent =
            i > 0
              ? dimensionNames
                  .slice(0, i)
                  .map((dim) => row[dim].value)
                  .toString()
              : null;
          // Check if there are any more dimensions.
          // Only the last non-null one gets a 'value'.
          let nextDimValue =
            dimensionNames[i + 1] &&
            row[dimensionNames[i + 1]] &&
            row[dimensionNames[i + 1]].value;
          let getsValue: boolean =
            i == dimCount - 1 ||
            !row[dimensionNames[i + 1]] ||
            !row[dimensionNames[i + 1]].value ||
            row[dimensionNames[i + 1]].value.length === 0;

          // If the entry already exists in data, add to it.
          let currentIndex = seriesData.findIndex((z) => z.id === id);
          if (currentIndex > -1) {
            let newNumerator = seriesData[currentIndex].numerator + numerator
            let newDenominator = seriesData[currentIndex].denominator + denominator
            seriesData[currentIndex].numerator = newNumerator
            seriesData[currentIndex].denominator = newDenominator
            // Recalculate the percent based on new entries.
            seriesData[currentIndex].percent = Math.floor((newNumerator / newDenominator) * 100)
          } else if (getsValue) {
            // Create a new entry
            seriesData.push({
              id: id,
              parent: parent,
              name: row[dimName].value,
              value: denominator,
              denominator: denominator,
              numerator: numerator,
              percent: Math.floor((numerator / denominator) * 100),
            });
          } else {
            seriesData.push({
              id: id,
              parent: parent,
              name: row[dimName].value,
              numerator: numerator,
              denominator: denominator,
              percent: Math.floor((numerator / denominator) * 100),
            });
          }
        });
      }
      // End data / rows loop
    });

    // element.innerHTML = `data1:
    //           ${JSON.stringify(seriesData)}
    //           data2:
    //           ${JSON.stringify(row)}`;
    // return;
    // done();

    let series: any = {};
    series.data = seriesData;
    series.borderWidth = config.internalBorder ? 1 : 0;
    series.borderColor = "white";
    series.allowDrillToNode = true;
    series.cursor = "pointer";
    series.dataLabels = {
      format: "{point.name}",
      filter: {
        property: "innerArcLength",
        operator: ">",
        value: 16,
      },
      rotationMode: "circular",
    };

    //    These are the Highcharts options (not the looker viz config options)
    chartOptions = baseChartOptions;

    chartOptions.series = [series];

    var vizDiv = document.createElement("div");
    vizDiv.setAttribute("id", "viz");
    element.appendChild(vizDiv);
    let vizDivRef = document.getElementById("viz");
    Highcharts.chart(vizDivRef, chartOptions);

    done();
  },
};

function getFinalSectionOfPipedString(input: string): string {
  let finalString: string = "";
  let array: Array<string> = input.split("|");
  finalString = array[array.length - 1];
  return finalString;
}

looker.plugins.visualizations.add(vis);
