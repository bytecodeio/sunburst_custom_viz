import { Looker, VisualizationDefinition } from '../common/types';
import { handleErrors, rounder } from '../common/utils';

import * as Highcharts from 'highcharts';
// Load module after Highcharts is loaded
require('highcharts/modules/sunburst')(Highcharts);

declare var looker: Looker;
let chartOptions: any;
chartOptions = {
    chart: {
        type: 'sunburst',
        plotBorderWidth: 0,
        plotBorderColor: '#ffffff'
    },
    credits: {
        enabled: false
    },
    title: {
        floating: true,
        text: ''
    },
    legend: {
        align: 'right',
        layout: 'vertical',
        margin: 10,
        y: 25,
        verticalAlign: 'top',
        symbolHeight: 280
    },
    series: [
    ],
    plotOptions: {
        series: {
            states: {
                hover: {
                    enabled: false,
                    halo: null
                },
                select: {
                    halo: null
                }
            }
        }
    },
    tooltip: {
        formatter: function (tooltip) {
            if (this.point.isNull) {
                return 'Null';
            }
            return this.point.value;
        }
    }
};
let baseChartOptions = chartOptions;

interface SunburstViz extends VisualizationDefinition {
    elementRef?: HTMLDivElement,
}

const vis: SunburstViz = {
    id: 'custom-sumburst', // id/label not required, but nice for testing and keeping manifests in sync
    label: 'custom-sunburst',
    options: {},
    // Set up the initial state of the visualization
    create(element, config) {
        element.innerHTML = "Rendering ...";
        // chart = Highcharts.stockChart(element, chartOptions)
    },
    // Render in response to the data or settings changing
    async updateAsync(data, element, config, queryResponse, details, done) {

        element.innerHTML = '';

        const errors = handleErrors(this, queryResponse, {
            max_pivots: 0,
            min_dimensions: 2,
            max_dimensions: 4,
            min_measures: 1,
            max_measures: 2
        });

        let measures = queryResponse.fields.measure_like.map((field) => {
            let key = field.label;
            let value = field.name;
            return { [key]: value };
        });

        // These are the looker viz options. 
        let options = this.options;

        options["numerator"] =
        {
            section: "Values",
            type: "string",
            label: "Numerator Measure",
            display: "select",
            values: measures,
            order: 1
        };
        options["denominator"] =
        {
            section: "Values",
            type: "string",
            label: "Denominator Measure",
            display: "select",
            values: measures,
            order: 1
        };

        options["minColor"] =
        {
            section: "Colors",
            type: "array",
            label: "Minimum Value Color",
            display: "color",
            default: "#263279",
            order: 3
        };
        options["midColor"] =
        {
            section: "Colors",
            type: "array",
            label: "Median Value Color",
            display: "color",
            default: "#D9DDDE",
            order: 4
        };
        options["maxColor"] =
        {
            section: "Colors",
            type: "array",
            label: "Maximum Value Color",
            display: "color",
            default: "#670D23",
            order: 5
        };

        this.trigger('registerOptions', options); // register options with parent page to update visConfig

        // element.innerHTML = `Please specify each category. They will be treated hierarchically.
        //     ${JSON.stringify(config.category1)}`
        // return

     
        let seriesData: Array<any> = [];
        let dimensionNames: Array<string> = queryResponse.fields.dimension_like.map(x => x.name)
        let dimCount: number = dimensionNames.length
        let lastDimension: string = dimensionNames[dimCount-1]

        data.forEach(function (row, i) {
            var denominator: number = parseInt(row[config.denominator].value);
            var numerator: number = parseInt(row[config.numerator].value);
            var percent = denominator === 0 ? 0 : numerator/denominator;

            let rowId: string = ''
            dimensionNames.forEach((x,i) => {
                rowId += row[x].value
            })
            let parentId: string = ''
            dimensionNames.forEach((x,i) => {
                if(i != dimCount-1) parentId += row[x].value
            })

            
            
            seriesData.push({
                    id: rowId,
                    parent: parentId,
                    name: row[lastDimension].value,
                    value: denominator,
                    percent: percent
                });

            // element.innerHTML = `data1:
            //     ${JSON.stringify(seriesData)}
            //     data2:
            //     ${JSON.stringify(row)}`
            //     return
            //     done();

        });

        let series: any = {};
        series.data = seriesData;
        series.borderWidth = config.internalBorder ? 1 : 0;
        series.borderColor = 'white';


        //    These are the Highcharts options (not the looker viz config options)
        chartOptions = baseChartOptions;


        chartOptions.series = [series];

        var vizDiv = document.createElement('div');
        vizDiv.setAttribute('id', 'viz');
        element.appendChild(vizDiv);
        let vizDivRef = document.getElementById('viz');
        Highcharts.chart(vizDivRef, chartOptions);

        done();
    }
}

function getFinalSectionOfPipedString(input: string): string {
    let finalString: string = '';
    let array: Array<string> = input.split('|');
    finalString = array[array.length - 1];
    return finalString;
}

looker.plugins.visualizations.add(vis);
