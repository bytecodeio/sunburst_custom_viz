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
    style: {
      fontFamily: '"Source Sans Pro","Helvetica Neue",Helvetica,Arial,sans-serif'
    }
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
      formatter: function () {
          if (this.point.name === ' ') return false
          return  `<b>${this.point.name}</b> has <b>${this.point.value}</b> employees with <b>${this.point.percent}%</b> compliance`
      },
    headerFormat: "",
    // pointFormat:
    //   "<b>{point.name}</b> has <b>{point.value}</b> employees with <b>{point.percent}%</b> compliance",
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
      max_dimensions: 10,
      min_measures: 2,
      max_measures: 10,
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
    options["tooltipFormat"] = {
      section: "Format",
      type: "string",
      label: "Tooltip Format. Use variables like ${this.point.value}, ${this.point.name}, ${this.point.numerator}, and ${this.point.percent}",
      display: "text",
      default: "<b>${this.point.name}</b> has <b>${this.point.value}</b> employees with <b>${this.point.percent}%</b> compliance"
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
      label: "Middle Color",
      display: "color",
      default: "#D9DDDE",
      order: 4,
    };
    options["colorStop"] = {
      section: "Colors",
      type: "number",
      label: "Middle Color at Percent",
      display: "range",
      max: 0.98,
      min: 0.02,
      step: 0.01,
      default: 0.5,
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

    // A little functional composition to put the default configs into the fetch color function.
    let color = (percent:number) => fetchColor(percent,config.colorStop,config.minColor[0],config.midColor[0],config.maxColor[0])
    
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
          let getsValue: boolean =
            i == dimCount - 1 ||
            !row[dimensionNames[i + 1]] ||
            !row[dimensionNames[i + 1]].value ||
            row[dimensionNames[i + 1]].value.length === 0;

          // If there is no dimension in the results, obscure the slice.
          let obscureValue =
          !row[dimensionNames[i]] ||
          !row[dimensionNames[i]].value ||
          row[dimensionNames[i]].value.length === 0;;

          // If the entry already exists in data, add to it.
          let currentIndex = seriesData.findIndex((z) => z.id === id);
          if (currentIndex > -1) {
            let newNumerator = seriesData[currentIndex].numerator + numerator
            let newDenominator = seriesData[currentIndex].denominator + denominator
            seriesData[currentIndex].numerator = newNumerator
            seriesData[currentIndex].denominator = newDenominator
            // Recalculate the percent based on new entries.
            seriesData[currentIndex].percent = Math.floor((newNumerator / newDenominator) * 100)
            seriesData[currentIndex].color = color((newNumerator / newDenominator))
     
          } else if (getsValue) {
            // Create a new entry
            seriesData.push({
              id: id,
              parent: parent,
              name: obscureValue ? ' ' : row[dimName].value,
              value: denominator,
              denominator: denominator,
              numerator: numerator,
              percent: Math.floor((numerator / denominator) * 100),
              color: obscureValue ? 'white' :color((numerator / denominator))
            });
          }else {
            seriesData.push({
              id: id,
              parent: parent,
              name: obscureValue ? ' ' : row[dimName].value,
              numerator: numerator,
              denominator: denominator,
              percent: Math.floor((numerator / denominator) * 100),
              color: obscureValue ? 'white' :color((numerator / denominator))
            });
            console.log(config.midColor)
            console.log(config.maxColor)
            console.dir(color((numerator / denominator)))
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
        value: 20,
      },
      style: {
        textOutline: 'none',
      },
      rotationMode: "parallel",
    };

    //    These are the Highcharts options (not the looker viz config options)
    chartOptions = baseChartOptions;

    chartOptions.series = [series];
    chartOptions.tooltip.formatter =  function () {
      if (this.point.name === ' ') return false
      return  eval('`'+config.tooltipFormat+'`');
    }
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

const fetchColor=(percent:number, stop:number, minColor:string, midColor:string , maxColor:string) => {
  if(percent > stop) {
    let blendPercent = (percent - stop) / (1-stop)
    return pSBC(blendPercent , midColor, maxColor)
  } else {
    let blendPercent = (percent / stop)
    return pSBC(blendPercent , minColor, midColor)
  }
}

const pSBC=(p:number,c0:string,c1:string)=>{
  // from:  https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js)
  let l=false;
	let r,g,b,P,f,t,h,i=parseInt,m=Math.round,a=typeof(c1)=="string";
  if(typeof(p)!="number"||p<-1||p>1||typeof(c0)!="string"||(c0[0]!='r'&&c0[0]!='#')||(c1&&!a))return null;
  // @ts-ignore
	if(!this.pSBCr)this.pSBCr=(d)=>{
		let n=d.length,x={};
		if(n>9){
			[r,g,b,a]=d=d.split(","),n=d.length;
      if(n<3||n>4)return null;
      // @ts-ignore
			x.r=i(r[3]=="a"?r.slice(5):r.slice(4)),x.g=i(g),x.b=i(b),x.a=a?parseFloat(a):-1
		}else{
			if(n==8||n==6||n<4)return null;
			if(n<6)d="#"+d[1]+d[1]+d[2]+d[2]+d[3]+d[3]+(n>4?d[4]+d[4]:"");
      d=i(d.slice(1),16);
      // @ts-ignore
      if(n==9||n==5)x.r=d>>24&255,x.g=d>>16&255,x.b=d>>8&255,x.a=m((d&255)/0.255)/1000;
      // @ts-ignore
			else x.r=d>>16,x.g=d>>8&255,x.b=d&255,x.a=-1
    }return x};
    // @ts-ignore
	h=c0.length>9,h=a?c1.length>9?true:c1=="c"?!h:false:h,f=this.pSBCr(c0),P=p<0,t=c1&&c1!="c"?this.pSBCr(c1):P?{r:0,g:0,b:0,a:-1}:{r:255,g:255,b:255,a:-1},p=P?p*-1:p,P=1-p;
  if(!f||!t)return null;
  // @ts-ignore
  if(l)r=m(P*f.r+p*t.r),g=m(P*f.g+p*t.g),b=m(P*f.b+p*t.b);
  // @ts-ignore
  else r=m((P*f.r**2+p*t.r**2)**0.5),g=m((P*f.g**2+p*t.g**2)**0.5),b=m((P*f.b**2+p*t.b**2)**0.5);
  // @ts-ignore
  a=f.a,t=t.a,f=a>=0||t>=0,a=f?a<0?t:t<0?a:a*P+t*p:0;
  // @ts-ignore
  if(h)return"rgb"+(f?"a(":"(")+r+","+g+","+b+(f?","+m(a*1000)/1000:"")+")";
  // @ts-ignore
	else return"#"+(4294967296+r*16777216+g*65536+b*256+(f?m(a*255):0)).toString(16).slice(1,f?undefined:-2)
}

looker.plugins.visualizations.add(vis);
