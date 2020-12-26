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

        let measuresName = queryResponse.fields.measure_like[0].name;

        let dimensions = queryResponse.fields.dimension_like.map((field) => {
            let key = field.label;
            let value = field.name;
            return { [key]: value };
        });

        // These are the looker viz options. 
        let options = this.options;

        options["category1"] =
        {
            section: "Values",
            type: "string",
            label: "Top category dimension",
            display: "select",
            values: dimensions,
            order: 1
        };
        options["category2"] =
        {
            section: "Values",
            type: "string",
            label: "Second category dimension",
            display: "select",
            values: dimensions,
            order: 2
        };
        options["category3"] =
        {
            section: "Values",
            type: "string",
            label: "Third category dimension",
            display: "select",
            values: dimensions,
            order: 3
        };
        options["category4"] =
        {
            section: "Values",
            type: "string",
            label: "Fourth category dimension",
            display: "select",
            values: dimensions,
            order: 4
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

        let category1 = this.options.category1;
        let category2 = this.options.category2;

        if (!category1 || !category2) {
            vis.addError({
                title: `Please Define Categories`,
                message: `This visualization requires at least two categories defined in the options.`
            });
        }
        let xCategories: Array<string> = [];
        let seriesData: Array<any> = [];
        let yCategories: Array<string> = Object.keys(data[0][measuresName]).map(x => getFinalSectionOfPipedString(x));

        data.forEach(function (row, i) {
            var secondCategoryCell = row[config.secondCategory];
            var values = Object.values(data[i][measuresName]);

            values.map((x: any, j: number) => {
                if (config.reverseXY) {
                    seriesData.push([j, i, rounder(x.value, config.decimalPrecision)]);
                } else {
                    seriesData.push([i, j, rounder(x.value, config.decimalPrecision)]);
                }
            });

            xCategories.push(
                secondCategoryCell.value
            );
        });

        let pivotedSeries: any = {};
        pivotedSeries.data = seriesData;
        pivotedSeries.borderWidth = config.internalBorder ? 1 : 0;
        pivotedSeries.borderColor = 'white';


        //    These are the Highcharts options (not the looker viz config options)
        chartOptions = baseChartOptions;

        if (config.maxWidth && config.maxWidth > 0) {
            element.style.width = `${config.maxWidth}px`;
        }
        if (config.maxHeight && config.maxHeight > 0) {
            chartOptions.chart.height = `${config.maxHeight}px`;
        }

        if (config.reverseXY) {
            chartOptions.xAxis.categories = yCategories;
            chartOptions.yAxis.categories = xCategories;
        } else {
            chartOptions.xAxis.categories = xCategories;
            chartOptions.yAxis.categories = yCategories;
        }

        chartOptions.xAxis.labels.style.fontSize = `${config.xAxisFontSize}px`;
        chartOptions.yAxis.labels.style.fontSize = `${config.yAxisFontSize}px`;

        chartOptions.legend.symbolHeight = config.maxHeight - 200;

        if (config.xAxisOnTop && config.xAxisRotation) {
            chartOptions.xAxis.opposite = config.xAxisOnTop;
            chartOptions.xAxis.labels.rotation = -90;
            chartOptions.chart.marginTop = 200;
            chartOptions.chart.marginBottom = 0;
            chartOptions.chart.height = `${config.maxHeight + 200}px`;
            chartOptions.legend.y = 182;
        }
        else if (config.xAxisRotation) {
            delete chartOptions.xAxis.opposite;
            chartOptions.xAxis.labels.rotation = -90;
            chartOptions.chart.marginTop = 0;
            chartOptions.chart.marginBottom = 200;
            chartOptions.chart.height = `${config.maxHeight + 200}px`;
            chartOptions.legend.y = -10;
        }
        else if (config.xAxisOnTop) {
            chartOptions.xAxis.opposite = config.xAxisOnTop;
            delete chartOptions.xAxis.labels.rotation;
            chartOptions.chart.marginTop = 40;
            chartOptions.chart.marginBottom = 0;
            chartOptions.chart.height = `${config.maxHeight}px`;
            chartOptions.legend.y = 25;
        }
        else {
            delete chartOptions.xAxis.labels.rotation;
            delete chartOptions.xAxis.opposite;
            chartOptions.chart.marginTop = 0;
            chartOptions.chart.marginBottom = 40;
            chartOptions.chart.height = `${config.maxHeight}px`;
            chartOptions.legend.y = -10;
        }

        let colorAxis: any = {
            min: config.minValue || 40,
            max: config.maxValue || 60,
            reversed: false
        };
        if (config.colorScheme == 'Custom') {
            colorAxis.stops = [
                [0, `${config.minColor}` || '#263279'],
                [0.5, `${config.midColor}` || '#D9DDDE'],
                [1, `${config.maxColor}` || '#670D23']];
        }
        else {
            const stopsize = 1 / 15;
            if (config.colorScheme == 'Derek') {
                colorAxis.stops = [[0, '#3C0912'],
                [1 * stopsize, '#670D23'],
                [2 * stopsize, '#931327'],
                [3 * stopsize, '#B23727'],
                [4 * stopsize, '#C26245'],
                [5 * stopsize, '#CF8971'],
                [6 * stopsize, '#DBB1A3'],
                [7 * stopsize, '#E8D8D3'],
                [8 * stopsize, '#D9DDDE'],
                [9 * stopsize, '#A8C1CB'],
                [10 * stopsize, '#73A8BD'],
                [11 * stopsize, '#428EBA'],
                [12 * stopsize, '#166FBB'],
                [13 * stopsize, '#1C4BB2'],
                [14 * stopsize, '#263279'],
                [1, '#181C43']];
            }
            else if (config.colorScheme == 'Roma') {
                colorAxis.stops = [[0, '#7E1900'],
                [1 * stopsize, '#924410'],
                [2 * stopsize, '#A4661E'],
                [3 * stopsize, '#B48A2C'],
                [4 * stopsize, '#C5AD40'],
                [5 * stopsize, '#D9D26A'],
                [6 * stopsize, '#E5E598'],
                [7 * stopsize, '#DFECBB'],
                [8 * stopsize, '#BFEBD2'],
                [9 * stopsize, '#8CDED9'],
                [10 * stopsize, '#60C3D4'],
                [11 * stopsize, '#4CA3C9'],
                [12 * stopsize, '#3F85BB'],
                [13 * stopsize, '#3368B0'],
                [14 * stopsize, '#274DA4'],
                [1, '#1A3399']];
            }
            else if (config.colorScheme == 'Cork') {
                colorAxis.stops = [[0, '#2C194C'],
                [1 * stopsize, '#2A3366'],
                [2 * stopsize, '#2A4E80'],
                [3 * stopsize, '#3F6C99'],
                [4 * stopsize, '#658AAD'],
                [5 * stopsize, '#8CA7C3'],
                [6 * stopsize, '#B6C6D8'],
                [7 * stopsize, '#DDE5EB'],
                [8 * stopsize, '#DFEBE1'],
                [9 * stopsize, '#BBD8BF'],
                [10 * stopsize, '#98C39B'],
                [11 * stopsize, '#73AD79'],
                [12 * stopsize, '#529754'],
                [13 * stopsize, '#3F7A33'],
                [14 * stopsize, '#406119'],
                [1, '#434C01']];
            }
            else if (config.colorScheme == 'Tofino') {
                colorAxis.stops = [[0, '#DED8FF'],
                [1 * stopsize, '#B0B8EB'],
                [2 * stopsize, '#8399D7'],
                [3 * stopsize, '#5777B9'],
                [4 * stopsize, '#395790'],
                [5 * stopsize, '#263B65'],
                [6 * stopsize, '#19253D'],
                [7 * stopsize, '#0E141D'],
                [8 * stopsize, '#0E1B12'],
                [9 * stopsize, '#183219'],
                [10 * stopsize, '#244C27'],
                [11 * stopsize, '#336C38'],
                [12 * stopsize, '#4A8C4B'],
                [13 * stopsize, '#76AE66'],
                [14 * stopsize, '#A9CB80'],
                [1, '#DAE59A']];
            }
            else if (config.colorScheme == 'Berlin') {
                colorAxis.stops = [[0, '#FFACAC'],
                [1 * stopsize, '#DA8B84'],
                [2 * stopsize, '#B86A5B'],
                [3 * stopsize, '#964A35'],
                [4 * stopsize, '#722B15'],
                [5 * stopsize, '#501802'],
                [6 * stopsize, '#371000'],
                [7 * stopsize, '#210C01'],
                [8 * stopsize, '#121214'],
                [9 * stopsize, '#112632'],
                [10 * stopsize, '#194155'],
                [11 * stopsize, '#255F7B'],
                [12 * stopsize, '#327FA5'],
                [13 * stopsize, '#4C9DCE'],
                [14 * stopsize, '#76ABEB'],
                [1, '#9EB0FF']];
            }
            else if (config.colorScheme == 'Vik') {
                colorAxis.stops = [[0, '#601200'],
                [1 * stopsize, '#743100'],
                [2 * stopsize, '#875001'],
                [3 * stopsize, '#9F711B'],
                [4 * stopsize, '#B39148'],
                [5 * stopsize, '#C7AD78'],
                [6 * stopsize, '#DCCBA7'],
                [7 * stopsize, '#ECE6D8'],
                [8 * stopsize, '#D9E6EC'],
                [9 * stopsize, '#A5C9D9'],
                [10 * stopsize, '#70A7C3'],
                [11 * stopsize, '#3985AC'],
                [12 * stopsize, '#106496'],
                [13 * stopsize, '#014683'],
                [14 * stopsize, '#012C72'],
                [1, '#001260']];
            }
        }

        chartOptions.colorAxis = colorAxis;

        chartOptions.series = [pivotedSeries];

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
