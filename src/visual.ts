/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    "use strict";

    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import legend = powerbi.extensibility.utils.chart.legend;
    import createLegend = powerbi.extensibility.utils.chart.legend.createLegend;
    import LegendData = powerbi.extensibility.utils.chart.legend.LegendData;
    import ILegend = powerbi.extensibility.utils.chart.legend.ILegend;
    import legendIcon = powerbi.extensibility.utils.chart.legend.LegendIcon;
    import LegendPosition = powerbi.extensibility.utils.chart.legend.LegendPosition;
    import IColorPalette = powerbi.extensibility.IColorPalette;
    import TooltipEventArgs = powerbi.extensibility.utils.tooltip.TooltipEventArgs;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;
    import ValueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import IValueFormatter = powerbi.extensibility.utils.formatting.IValueFormatter;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;
    import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
    import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;
    import appendClearCatcher = powerbi.extensibility.utils.interactivity.appendClearCatcher;
    import ColorHelper = powerbi.extensibility.utils.color;

    // tslint:disable-next-line:no-any
    let thisObj: any;
    let width: number;
    let height: number;
    let adjustedLegendHeight: number = 0;
    let legendWidth: number;
    // tslint:disable-next-line:no-any
    let valuesArray: any = [];
    let selectionArray: any = [];
    // tslint:disable-next-line:no-any
    let slice: any;
    let globalDepth: number = -1;
    // tslint:disable-next-line:no-any
    let parentSum: any = [];
    let parentSelection: any = [];
    let parentIterator: number = 0;
    // tslint:disable-next-line:no-any
    let groupColorArray: any = [];
    // tslint:disable-next-line:no-any
    let globalVisisbleArray: any = [];
    // tslint:disable-next-line:no-any
    let lastLevelDataPoints: any[] = [];
    let legendData: LegendData;
    let iCount: number = 0;
    let legendDisplay: string = "";
    const rotateOpen: string = "rotate(";
    const translate: string = ")translate(";
    const rotateClose: string = ") rotate(";
    const closeLiteral: string = ")";
    const textLiteral: string = "\u2026";
    const zeroOnlyLiteral: string = "0";
    const hashliteral: string = "#";
    const dataLiteral: string = "__data__";
    const tenthvalue: number = 10;
    const twoLiteral: number = 2;
    const fiveLiteral: number = 5;
    const fifteenLiteral: number = 15;
    const tweentyLiteral: number = 20;
    const thirtyLiteral: number = 30;
    const hundredLiteral: number = 100;
    const oneeightyLiteral: number = 180;
    const nintyLiteral: number = 90;
    const highopacity: number = 1;
    const lowopacity: number = 0.5;
    const errorMessagePadding: number = 3.5;
    const paddingFactor: number = 0.01;
    let categoriesLength: number = 0;
    let globalTreeChartDataPoints: any[] = [];
    let selectedSelectionId: ISelectionId[] = [];
    let pathSelectionArray: any = [];
    let centralTitleText: string = "";

    interface IObjects {
        name: string;
        value: number;
        depth: number;
        color: string;
        // tslint:disable-next-line:no-any
        children: any;
    }
    // tslint:disable-next-line:interface-name
    interface Children {
        name: string;
        value: number;
        depth: number;
        color: string;
        // tslint:disable-next-line:no-any
        children: any;
    }

    interface INodeDataPoint extends SelectableDataPoint {
        // tslint:disable-next-line:no-any
        identity: any;
    }

    // Interface for Detail Labels
    export interface IDetailLables {
        show: boolean;
        fontSize: number;
        color: string;
        labelDisplayUnits: number;
        labelPrecision: number;
        labelStyle: string;
    }

    /**
     * Gets property value for a particular object in a category.
     *
     * @function
     * @param {DataViewCategoryColumn} category - List of category objects.
     * @param {number} index                    - Index of category object.
     * @param {string} objectName               - Name of desired object.
     * @param {string} propertyName             - Name of desired property.
     * @param {T} defaultValue                  - Default value of desired property.
     */
    export function getCategoricalObjectValue<T>(objects: DataViewObjects,
                                                 objectName: string, propertyName: string, defaultValue: T): T {
        if (objects) {
            const object: DataViewObject = objects[objectName];
            if (object) {
                const property: T = object[propertyName] as T;
                if (property !== undefined) {
                    return property;
                }
            }
        }

        return defaultValue;

    }
    /**
     * Visual class contains variables to draw sunburst visual.
     */
    export class Sunburst implements IVisual {
        private static colorsPropertyIdentifier: DataViewObjectPropertyIdentifier = {
            objectName: "group",
            propertyName: "fill"
        };
        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }
        // tslint:disable-next-line:no-any
        public legendDataPoints: any;
        // tslint:disable-next-line:no-any
        public data: any;
        // tslint:disable-next-line:no-any
        public xScale: any;
        // tslint:disable-next-line:no-any
        public yScale: any;
        // tslint:disable-next-line:no-any
        public radius: any;
        // tslint:disable-next-line:no-any
        public arcGeneate: any;
        // tslint:disable-next-line:no-any
        public optionsUpdate: any;
        public gElement: any;
        public selectionArrayIndex: number;
        public measureDataLengthCount: number;
        private target: HTMLElement;
        private isLandingPageOn: boolean = false;
        private landingPageRemoved: boolean = false;
        // tslint:disable-next-line:no-any
        private landingPage: d3.Selection<any>;
        private updateCount: number;
        private settings: VisualSettings;
        private textNode: Text;
        // tslint:disable-next-line:no-any
        private mainDiv: any;
        // tslint:disable-next-line:no-any
        private svg: any;
        private colors: IColorPalette;
        private visualHost: IVisualHost;
        private legend: ILegend;
        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private events: IVisualEventService ;
        private dataViews: DataView;
        private measureData: DataViewValueColumns;
        private formatString: string;
        private totalValues: number;
        private catLength: number;
        private idGen: number;
        private measureIdGen: number;
        private interactivityService: IInteractivityService;
        private behavior: SunburstBehavior;
        private selectionManager: ISelectionManager;
        private arcsSelection: any;
        private legendPointSelection: any;

        constructor(options: VisualConstructorOptions) {
            this.visualHost = options.host;
            this.target = options.element;
            this.colors = options.host.colorPalette;
            this.optionsUpdate = options;
            this.tooltipServiceWrapper = createTooltipServiceWrapper(options.host.tooltipService, options.element);
            this.interactivityService = createInteractivityService(options.host);
            this.events = options.host.eventService;
            this.behavior = new SunburstBehavior();
            this.legend = createLegend(options.element, options.host && false, this.interactivityService, true);
            this.selectionManager = options.host.createSelectionManager();
            this.selectionManager.registerOnSelectCallback(
                (ids: ISelectionId[]) => {
                    this.syncSelectionState(this.arcsSelection, this.legendPointSelection,
                        this.selectionManager.getSelectionIds() as ISelectionId[], pathSelectionArray
                        );
                });
            this.mainDiv = d3.select(options.element)
                .append("div")
                .classed("MainDiv", true);
            const errormsg: any = d3.select(options.element)
                .append("div")
                .classed("barmsg", true);
            d3.select(".clearCatcher").remove();
        }
        // method to get the opacity of childrens elements
        // tslint:disable-next-line:no-any
        public getColorBands(bands: any): any {
            const baseOpacity: number = 0.4;
            let fraction: any = 0;
            for (let index: number = bands; index >= 1; index--) {
                fraction = ((index * ( (1 - baseOpacity) / bands)) + baseOpacity ) ;
                if (fraction < 0.1) {
                    fraction = 0.1;
                }
                groupColorArray.push(fraction);
            }

            return groupColorArray;
        }
         // method to check the max value for radius
        public checkRadius(): number {
            const radiusEntered: number = Number(this.settings.configuration.arcradius);
            const calculatedRadius: number = (Math.min(width, height) / twoLiteral) - tenthvalue;
            let returnValue: number = 0;
            if (radiusEntered < fiveLiteral || radiusEntered > calculatedRadius) {
                returnValue = Number(calculatedRadius.toFixed(twoLiteral));
            } else {
                returnValue = radiusEntered;
            }
            return returnValue;
        }
        // tslint:disable:no-any
        public createHieArr(data: any, seq: any): any {
            const hieObj: any = this.createHieobj(data, seq, 0);
            const hieArr: any = this.convertToHieArr(hieObj, "Top Level");

            return [{
                children: hieArr,
                name: "", parent: "null"
            }];
        }
        public limitValue(a: number, b: number): number {
            const returnValue: number = a <= b ? a : b;

            return returnValue;
        }
        public lowerLimitValue(a: number, b: number): number {
            const returnValue: number = a < b ? b : a;

            return returnValue;
        }
        // method to sort the array based on given key
        public sortByKey(array, key) {
            return array.sort((a, b) => {
                const x = a[key];
                const y = b[key];
                return ((x < y) ? 1 : ((x > y) ? -1 : 0));
            });
        }
        public convertToHieArr(eachObj: any, parent: any): any {
            const arr: any = [];
            // tslint:disable-next-line:forin
            for (const iterator in eachObj) {
                arr.push({
                    children: this.convertToHieArr(eachObj[iterator], iterator),
                    color: "",
                    depth: 0,
                    name: iterator,
                    parent,
                    selected: false,
                    selectionId: "",
                    value: 0,
                });
            }

            return arr;
        }
        // method to get the heirarchial structure data
        public createHieobj(data: any, seq: any, ind: any): any {
            const sequence: any = seq[ind];
            if (sequence === undefined) {
                return [];
            }
            const childObj: any = {};
            for (const ele of data) {
                if (ele[sequence] !== undefined) {
                    if (childObj[ele[sequence]] === undefined) {
                        childObj[ele[sequence]] = [];
                    }
                    // because of sorting ids are sorted
                    if (ind === categoriesLength ) {
                        selectionArray.push(ele.identity);
                    }
                    childObj[ele[sequence]].push(ele);
                }
            }
            ind = ind + 1;
            let sum: number = 0;
            let selectionArrayNew: any = [];
            // tslint:disable:forin
            for (const ch in childObj) {
                sum = 0;
                selectionArrayNew = [];
                for (const iterator of childObj[ch]) {
                    sum += iterator.values;
                    selectionArrayNew.push(iterator.identity);
                }
                parentSum.push(sum);
                parentSelection.push(selectionArrayNew);
            }
            for (const ch in childObj) {
                childObj[ch] = this.sortByKey(childObj[ch], "values");
                childObj[ch] = this.createHieobj(childObj[ch], seq, ind);
            }

            return childObj;
        }
         // method to set the depth property of data
        public Depth(data: any, index: any): any {
            for (const iterator of data ) {
                iterator.depth = index;
                if (iterator.children) {
                    this.Depth(iterator.children, index + 1);
                }
            }
        }
        // method to set the value property of data
        public Value(data: any): any {
            // for last child  nodes
            for (const iterator of data) {
                if (iterator.children.length !== 0) {
                    this.Value(iterator.children);
                } else {
                    iterator.value = valuesArray[iCount];
                    iterator.identity = selectionArray[iCount];
                    iCount++;
                }
            }

        }
        public parentValue(data: any): any {
            for (const iterator of data ) {
                iterator.value = parentSum[parentIterator];
                iterator.identity = parentSelection[parentIterator];
                parentIterator++;
            }
            for (const iterator of data) {
                if (iterator.children) {
                    this.parentValue(iterator.children);
                }
            }
        }
        public getDefaultData(): IObjects {
            return {
                children: [],
                color: "",
                depth: 0,
                name: "",
                value: 0,
            };
        }
         // method to create legend Datapoints
        public createLegendData(dataView: DataView, host: IVisualHost): void {
            const colorPalette: IColorPalette = host.colorPalette;
            const groups: DataViewValueColumnGroup[] = this.dataViews.categorical.values.grouped();
            let textStr: any = "";
            let legendcolor: string = "";

            groups.forEach((group: DataViewValueColumnGroup, iIterator: number = 0) => {
                textStr = group.name;
                const defaultColor: any = {
                    solid: {
                        color: colorPalette.getColor(textStr).value
                    }
                };
                legendcolor = getCategoricalObjectValue<Fill>(group.objects, "colorSelector", "fill",
                                                                            defaultColor).solid.color;
                legendData.dataPoints.push({
                    color: legendcolor,
                    icon: powerbi.extensibility.utils.chart.legend.LegendIcon.Circle,
                    identity: host.createSelectionIdBuilder()
                        .withSeries(this.dataViews.categorical.values, group)
                        .createSelectionId(),
                    label: group.name === null || "" ? "(Blank)" : String(group.name),
                    selected: false
                });
            });
        }
        // tslint:disable-next-line:typedef
        public getParentData() {
            const dp: Children[] = [];
            // tslint:disable-next-line:no-any
            const group: any[] = this.dataViews.categorical.values.grouped();
            for (const iterator of group) {
                dp.push({
                    children: [],
                    color: "",
                    depth: 0,
                    name: iterator.name,
                    value: 0,
                });
            }

            return dp;
        }
        // method to create the data structure for the visual
        // tslint:disable-next-line:no-any
        public converter(dataView: DataView, colors: any, host: IVisualHost, rootSettings: any): any {
            const dataViewLiteral: any = dataView.categorical.categories;
            // tslint:disable:no-any
            const columnnames: any = [];
            let groupDisplay: any = "Legend";
            for (const iterator of dataView.metadata.columns) {
                if (iterator.roles.parentcategory) {
                    groupDisplay = iterator.displayName;
                }
            }
            legendDisplay = groupDisplay;
            columnnames.push(groupDisplay);
            for (const jiterator of  dataViewLiteral) {
                columnnames.push(jiterator.source.displayName);
            }
            const groups: DataViewValueColumnGroup[] = dataView.categorical.values.grouped();
            const dummyData: any = [];
            valuesArray = [];
            selectionArray = [];
            let groupname: any = "";
            let categoriesDisplay: any = [];
            let categoriesValues: any = [];
            let groupValues: any = [];
            groups.forEach((group: DataViewValueColumnGroup, jterator: number) => {
                groupname = group.name === null || "" ? "(Blank)" : group.name;
                categoriesDisplay = [];
                categoriesValues = [];
                groupValues = [];
                let iteratorValue: any = 0;
                for (let iterator: number = 0; iterator < group.values[0].values.length;
                    iterator++) {
                    iteratorValue = group.values[0].values[iterator];
                    if (iteratorValue !== null) {
                        const selectionId: any = host.createSelectionIdBuilder()
                            .withCategory(dataViewLiteral[0], iterator)
                            .withSeries(dataView.categorical.values, group);
                        const obj: any = {};
                        iCount = 0;
                        obj[groupDisplay] = groupname;
                        let name: any = "";
                        let value: any = 0;
                        for (const jiterator of dataViewLiteral) {
                            name = jiterator.source.displayName;
                            value = jiterator.values[iterator] === null
                            || "" ? "(Blank)" : jiterator.values[iterator];
                            categoriesDisplay.push(name);
                            categoriesValues.push(value);
                            obj[name] = value;
                        }
                        const measureValue: any = iteratorValue;
                        obj.values = measureValue;
                        obj.identity = selectionId;
                        dummyData.push(obj);
                        valuesArray.push(iteratorValue);
                    }
                }
            });
            globalDepth = -1;
            parentSum = [];
            parentSelection = [];
            parentIterator = 0;
            const treeData: any = this.createHieArr(dummyData, columnnames);
            this.Depth(treeData[0].children, 0);
            iCount = 0;
            this.Value(treeData[0].children);
            this.parentValue(treeData[0].children);
            treeData[0].children = this.sortByKey(treeData[0].children, "value");
            legendData = {
                dataPoints: [],
                fontSize: this.settings.legend.fontSize,
                labelColor: this.settings.legend.color,
                title: this.settings.legend.title ? this.settings.legend.titleText : "",
            };
            this.createLegendData(dataView, host);
            legendData.title = this.settings.legend.title ?
            this.settings.legend.titleText !== "" ? this.settings.legend.titleText : legendDisplay : null;
            this.legendDataPoints = legendData;
            let parentColor: string;
            let parentSelectionID: any;
            groupColorArray = [];
            categoriesLength = dataViewLiteral.length;
            for (const iCounter of legendData.dataPoints) {
                for (const jCounter of treeData[0].children) {
                    parentColor = iCounter.color;
                    parentSelectionID = iCounter.identity;
                    if (iCounter.label === jCounter.name ) {
                        jCounter.opacity = 1;
                        jCounter.color = parentColor;
                        jCounter.selectionId = parentSelectionID;
                        jCounter.legendClass = iCounter.label;
                        globalTreeChartDataPoints.push(jCounter);
                    }
                }
            }
            const categorieslen: number = this.dataViews.categorical.categories.length + 1;
            // count for opacity
            this.getColorBands(categorieslen);
            const count: number = 0;
            for (const iChild of treeData[0].children) {
                this.addColor(iChild.children, iChild.color
                    , iChild.name , count);
                this.addSelectionId(iChild.children, iChild.selectionId);
            }
            this.interactivityService.applySelectionStateToData(globalTreeChartDataPoints);
            return treeData[0];

        }
        // method to set the color property of data
        public addColor(data: any, color: any , label: any , count: number): any {
            const parentColor: string = "";
            count++;
            for (const iIterator of data) {
                globalTreeChartDataPoints.push(iIterator);
                iIterator.color = color;
                iIterator.legendClass = label;
                iIterator.opacity = groupColorArray[count];
                if (iIterator.children) {
                    this.addColor(iIterator.children, color, label , count);
                }
            }
        }
        // method to set the selectionId property of data
        public addSelectionId(data: any, selectionID: any): any {
            const parentColor: string = "";
            for (const iIterator of  data) {
                globalTreeChartDataPoints.push(iIterator);
                iIterator.selectionId = selectionID;
                if (iIterator.children) {
                    this.addSelectionId(iIterator.children, selectionID);
                }
            }
        }
        public selectSelectionId(darray: any) {
            if (darray.children) {
                for (const iterator of darray.children) {
                    this.selectSelectionId(iterator);
                }
            } else {
                for (const iterator of darray.identity) {
                    selectedSelectionId.push(iterator);
                }
            }
        }
        // tslint:disable-next-line:no-any
        public getDistinctElements(val: any, i: any, self: any): boolean {
            return self.indexOf(val) === i;
        }
        // method to get the position of legend
        public legendPosition(options: VisualUpdateOptions): void {
            const legendHeight: IViewport = this.legend.getMargins();
            const mainDivLiteral: any = d3.selectAll(".MainDiv");
            const arrowLiteral: any = d3.select(".navArrow");
            switch (this.settings.legend.position) {
                case "Top":
                    height = options.viewport.height - legendHeight.height;
                    width = options.viewport.width;
                    adjustedLegendHeight = legendHeight.height;
                    mainDivLiteral.style({ "margin-left": 0,
                    "margin-right": 0,
                    "margin-top": `${legendHeight.height}px`,

                });
                    this.legend.changeOrientation(LegendPosition.Top);
                    break;
                case "Top center":
                    height = options.viewport.height - legendHeight.height;
                    legendWidth = legendHeight.width + thirtyLiteral;
                    width = options.viewport.width;
                    adjustedLegendHeight = legendHeight.height;
                    mainDivLiteral.style({ "margin-left": 0, "margin-right": 0,
                    "margin-top": `${legendHeight.height}px`,

                });
                    this.legend.changeOrientation(LegendPosition.TopCenter);
                    if (d3.select(".navArrow")[0][0] !== null) {
                        const xpos: string = d3.select(".navArrow").attr("transform").substring(tenthvalue,
                            d3.select(".navArrow")
                                .attr("transform").indexOf(","));
                        if (Number(xpos) > width - tenthvalue) {
                            this.legend.changeOrientation(0);
                            this.legend.drawLegend(legendData, options.viewport);
                        }
                        }
                    break;
                case "Bottom":
                    height = options.viewport.height - legendHeight.height;
                    width = options.viewport.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({  "margin-left": 0, "margin-right": 0, "margin-top": 0,

                });
                    this.legend.changeOrientation(LegendPosition.Bottom);
                    break;
                case "Bottom center":
                    height = options.viewport.height - legendHeight.height;
                    legendWidth = legendHeight.width + thirtyLiteral;
                    width = options.viewport.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({ "margin-left": 0, "margin-right": 0, "margin-top": 0,

                });
                    this.legend.changeOrientation(LegendPosition.BottomCenter);
                    if (d3.select(".navArrow")[0][0] !== null) {
                        const xpos: string = d3.select(".navArrow").attr("transform").substring(tenthvalue,
                            d3.select(".navArrow")
                                .attr("transform").indexOf(","));
                        if (Number(xpos) > width - tenthvalue) {
                            this.legend.changeOrientation(1);
                            this.legend.drawLegend(legendData, options.viewport);
                        }
                        }
                    break;
                case "Left":
                    height = options.viewport.height;
                    width = options.viewport.width - legendHeight.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({  "margin-left": `${legendHeight.width}px`, "margin-right": 0,
                    "margin-top": 0,

                });
                    this.legend.changeOrientation(LegendPosition.Left);
                    break;
                case "Left center":
                    height = options.viewport.height;
                    width = options.viewport.width - legendHeight.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({  "margin-left": `${legendHeight.width}px`, "margin-right": 0,
                    "margin-top": 0,

                });
                    this.legend.changeOrientation(LegendPosition.LeftCenter);
                    break;
                case "Right":
                    height = options.viewport.height;
                    width = options.viewport.width - legendHeight.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({ "margin-left": 0, "margin-right": `${legendHeight.width}px`,
                    "margin-top": 0,

                });
                    this.legend.changeOrientation(LegendPosition.Right);
                    break;
                case "Right center":
                    height = options.viewport.height;
                    width = options.viewport.width - legendHeight.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({
                    "margin-left": 0,
                    "margin-right": `${legendHeight.width}px`,
                    "margin-top": 0,
                });
                    this.legend.changeOrientation(LegendPosition.RightCenter);
                    break;
                default:
                    break;
            }
            // tslint:disable-next-line:no-any
            $(".legend #legendGroup").on("click.load", ".navArrow", (): any => {
                d3.selectAll(".main-arc").style("opacity", (arcPoint: SelectableDataPoint) => {
                    return 1;
                });
                this.selectionManager.clear();
                thisObj.legendClicked();
            });

        }
        // onclick method when legend is clicked
        public legendClicked(): void {
            const selectionManager: ISelectionManager = this.selectionManager;
            const legendelements: any = d3.selectAll(".legendItem")[0];
            d3.selectAll(".legendItem").on("click", function(d: any): void {
                for (const iterator of legendelements) {
                    iterator[dataLiteral].selected = false;
                }
                d.selected = true;
                const elements: any = d3.selectAll(".main-arc")[0];
                thisObj.markLegendPointsAsSelectedOnArc(d , elements);
                if (!thisObj.settings.animation.show) {
                    selectionManager.clear();
                    if (d3.select(this).classed("selectedlegend")) {
                        d3.selectAll(".legendItem").style("opacity", (legendPoint: SelectableDataPoint) => {
                            return 1;
                        });
                        d3.selectAll(".main-arc").style("opacity", (arcPoint: SelectableDataPoint) => {
                            return 1;
                        });
                        d3.select(this).classed("selectedlegend", false);
                    } else {
                        selectionManager.select(d.identity).then((ids: ISelectionId[]) => {
                            d3.selectAll(".legendItem").classed("selectedlegend", false);
                            d3.select(this).classed("selectedlegend", true);
                            d3.selectAll(".main-arc").style("opacity", (arcpt: SelectableDataPoint) => {
                                return (!arcpt.selected) ? lowopacity : highopacity;
                            });
                            d3.selectAll(".legendItem").style("opacity", (legendpt: SelectableDataPoint) => {
                                return (!legendpt.selected) ? lowopacity : highopacity;
                            });
                    });
                    }
                }
                (d3.event as Event).stopPropagation();
            });
        }
        // method to get the data and render the visual
        public update(options: VisualUpdateOptions): void {
            thisObj = this;
            this.HandleLandingPage(options);
            if (!options.dataViews.length) {
                return ;
            }
            this.events.renderingStarted(options);
            d3.select(".barmsg").selectAll("*").remove();
            globalTreeChartDataPoints = [];
            this.settings = Sunburst.parseSettings(options && options.dataViews && options.dataViews[0]);
            this.dataViews = options.dataViews[0];
            d3.select("#MainSvg").remove();
            this.svg = this.mainDiv
                .append("svg")
                .attr("id", "MainSvg")
                .style("cursor", "context-menu");
            const svgLiteral: any = d3.select("#MainSvg");
            const titleLiteral: any =  d3.selectAll(".legendTitle");
            const legenditems: any =  d3.selectAll(".legendItem");
            const barmsgLiteral: any = d3.select(".barmsg");
            this.svg.on("contextmenu", () => {
                const mouseEvent: MouseEvent = d3.event as MouseEvent;
                const eventTarget: EventTarget = mouseEvent.target;
                // tslint:disable-next-line:no-any
                const dataPoint: any = d3.select(eventTarget).datum();
                if (dataPoint !== undefined) {
                    this.selectionManager.showContextMenu(dataPoint ? dataPoint.selectionId : {}, {
                        x: mouseEvent.clientX,
                        y: mouseEvent.clientY
                    });
                    mouseEvent.preventDefault();
                }
            });
            if (this.dataViews === undefined ||
                this.dataViews.categorical === undefined ||
                this.dataViews.categorical.categories === undefined) {
                height = options.viewport.height;
                width = options.viewport.width;
                svgLiteral.remove();
                titleLiteral.remove();
                legenditems.remove();
                if (this.dataViews.categorical.values !== undefined &&
                    this.dataViews.categorical.values.source.roles.category) {
                        barmsgLiteral.style({
                        "margin-left": `${width / errorMessagePadding}px`,
                        "margin-top": `${height / twoLiteral}px`
                    })
                            .append("text")
                            .classed("barMessageText", true)
                            .text("Same values field cannot be inserted in Category and Subcategory fields");
                        return ;
                }
                if (this.dataViews.categorical.categories === undefined) {
                    barmsgLiteral.style({
                        "margin-left": `${width / errorMessagePadding}px`,
                        "margin-top": `${height / twoLiteral}px`
                    })
                            .append("text")
                            .classed("barMessageText", true)
                            .text("Insert Values in Mandatory SubCategory Field");
                    return ;
                }
            }
            if (this.dataViews.categorical.values === undefined ||
                this.dataViews.categorical.values.grouped === undefined) {
                height = options.viewport.height;
                width = options.viewport.width;
                svgLiteral.remove();
                titleLiteral.remove();
                legenditems.remove();
                barmsgLiteral.style({
                "margin-left": `${width / errorMessagePadding}px` ,
                "margin-top" : `${height / twoLiteral}px`
            })
                    .append("text")
                    .classed("barMessageText", true)
                    .text("Insert Values in Mandatory Measure Field");

                return ;
            }
            // for same field in Category and Subcategory Field
            for (const iterator of this.dataViews.categorical.categories) {
                if (iterator.source.roles.parentcategory) {
                    height = options.viewport.height;
                    width = options.viewport.width;
                    svgLiteral.remove();
                    titleLiteral.remove();
                    legenditems.remove();
                    barmsgLiteral.style({
                    "margin-left": `${width / errorMessagePadding}px`,
                    "margin-top": `${height / twoLiteral}px`
                })
                        .append("text")
                        .classed("barMessageText", true)
                        .text("Same values field cannot be inserted in Category and Subcategory fields");
                    return ;
                }
            }
            this.data = this.converter(this.dataViews, this.colors, this.visualHost, this.settings);

            d3.select(".legend").style({visiblity : "visible"});
            if (this.settings.legend.show) {
                this.legendPosition(options);
                this.legend.drawLegend(legendData, options.viewport);
                this.legendPosition(options);
                this.legendClicked();

            } else {
                d3.selectAll(".MainDiv").style({
                "margin-left": 0,
                "margin-right": 0,
                "margin-top": 0,
            });
                height = options.viewport.height;
                width = options.viewport.width;
                titleLiteral.remove();
                legenditems.remove();
            }
            categoriesLength = this.dataViews.categorical.categories.length;
            const cornerRadiusValue: number =  this.limitValue(this.lowerLimitValue
                (this.settings.configuration.cornerradius , 0),
                tenthvalue);
            const arcpaddingValue: number = this.limitValue(this.lowerLimitValue
                (this.settings.configuration.padding , 0),
                tenthvalue) * paddingFactor;
            this.radius = this.checkRadius();
            // reduce the radius when detail labels are on
            if (this.settings.detailLabels.show) {
            this.radius = this.radius - this.settings.detailLabels.fontSize;
            }
            // tslint:disable-next-line:no-any
            const x: any = this.xScale = d3.scale.linear()
                .range([0, twoLiteral * Math.PI])
                .clamp(true);
            // tslint:disable-next-line:no-any
            const y: any = this.yScale = d3.scale.pow()
                .range([0, this.radius]);

            // tslint:disable-next-line:typedef no-any
            const partitionLayout: any = d3.layout.partition().value((d) => d.value);

            // tslint:disable-next-line:no-any
            const arcGenerator: any = this.arcGeneate = d3.svg.arc()
                // tslint:disable:typedef
                .startAngle((d) => Math.max(0, Math.min(twoLiteral * Math.PI, x(d[`x`]))))
                .endAngle((d) => Math.max(0, Math.min(twoLiteral * Math.PI, x(d[`x`] + d[`dx`]))))
                .innerRadius((d) => Math.max(0, y(d[`y`])))
                .outerRadius((d) => Math.max(0, y(d[`y`] + d[`dy`])))
                .cornerRadius(cornerRadiusValue)
                .padAngle(arcpaddingValue);

            const rootNode = this.data;
            const format = d3.format(",d");

            this.svg.style({height: `${height}px`, width: `${width}px`

        })
                .attr("viewBox", `${-width / twoLiteral} ${-height / twoLiteral} ${width} ${height}`);

            slice = this.svg.selectAll("g.slice")
                .data(partitionLayout.nodes(rootNode));

            slice.exit().remove();

            const newSlice = this.gElement = slice.enter()
                .append("g").attr("class", "slice");

            // tslint:disable:no-any
            const selectionManager: ISelectionManager = this.selectionManager;
            let startAngle = 0;
            let endAngle = 0;
            let angle = 0;
            const pathElements: any = newSlice.append("path")
                .attr("id", (d: any, index: number) => {
                    return `path-${index}`;
                })
                .attr("class", (d: any, index: number) => {
                    // for tooltip central labels
                    if (index === 0) {
                        return "main-arc";
                    } else {
                        return `${"main-arc"} ${"arc-path"}`;
                   }
                })
                .attr("d", arcGenerator)
                .style("fill", (d) => {
                    startAngle = Math.max(0, Math.min(twoLiteral * Math.PI, x(d[`x`])));
                    endAngle = Math.max(0, Math.min(twoLiteral * Math.PI, x(d[`x`] + d[`dx`])));
                    angle = endAngle - startAngle;
                    d.width = ((Math.PI * angle) / oneeightyLiteral) * Math.max(0, (y(d.y) + y(d.dy)));
                    if (!d.depth) {
                        return thisObj.settings.configuration.fill;
                    } else {
                        return d.color;
                    }
                })
                .style("fill-opacity" , (d) => d.opacity)
                 .style("stroke" , this.settings.configuration.strokecolor);
            // to store the ids for bookmarks
            pathSelectionArray = [];
            for (const iterator of pathElements[0]) {
                pathSelectionArray.push({
                    path : iterator,
                    selection : iterator[dataLiteral].identity
                });
            }
            const pathElementsHidden: any = newSlice.append("path")
                .attr("id", (d: any, index: number) => {
                    return `path-hidden-${index}`;
                })
                .attr("class", "main-arc-hidden")
                .attr("d", (d: any, index: number) => {

                    return d3.select(`#path-${index}`).attr("d").split("L")[0];
                })
                .attr("fill", "none");
            this.arcsSelection = d3.selectAll("path.main-arc");
            this.legendPointSelection = d3.selectAll(".legendItem");
            if (!this.settings.animation.show) {
                d3.select("#path-0").style("cursor", "default");
            }
            if (this.settings.dataLabels.show) {
                let heightDataLabel: number = 0;
                let demo: number = 0;
                let textPropertiesDestSourceName: TextProperties;
                const textEnter = newSlice.append("text")
                    .attr("id", (d: any, index: number) => {
                        return `text-${index}`;
                    })
                    .attr("class", "datalabels")
                    .attr("dy", (d) => {
                        return (Math.max(0, y(d[`y`] + d[`dy`])) - Math.max(0, y(d[`y`]))) / twoLiteral;
                    })
                    .attr("background-color", thisObj.settings.dataLabels.backgroundcolor)
                    .style({
                    "background-color": this.settings.dataLabels.backgroundcolor,
                    "fill": this.settings.dataLabels.color,
                    "fill-opacity": 1,
                    "font-family": this.settings.dataLabels.fontFamily,
                    "font-size": `${this.settings.dataLabels.fontSize}px`,
                });
                textEnter.append("textPath")
                .attr("id", (d: any, index: number) => {
                    return `textPath-${index}`;
                })
                .attr("startOffset", "50%")
                    .attr("xlink:href", (d, i) => `#path-hidden-${i}`)
                    .text((d, i) => {
                        demo = Math.max(0, y(d[`y`] + d[`dy`])) - Math.max(0, y(d[`y`]));
                        textPropertiesDestSourceName = {
                            fontFamily: thisObj.settings.dataLabels.fontFamily,
                            fontSize: `${thisObj.settings.dataLabels.fontSize}px`,
                            text: d.name
                        };
                        if (d.depth === 1) {
                            heightDataLabel =
                        textMeasurementService.measureSvgTextHeight(textPropertiesDestSourceName);
                        }
                        // to check the height of data labels
                        if (heightDataLabel + fiveLiteral  < demo) {
                            return d.name;
                        } else {
                            return "";
                        }

                    })
                    .each(this.wrapPathText(fifteenLiteral));
                d3.select("#text3").style("background-color", this.settings.dataLabels.backgroundcolor);
                d3.select("#text3").attr("fill", thisObj.settings.dataLabels.backgroundcolor);
            }
            if (thisObj.settings.centralLabel.show) {
                let totalHeight: number = 0;
                let degree: number;
                let textPropertiesDestSource: TextProperties;
                let textStrings: string = "";
                let primaryFormatterVal: number = 0;
                let primaryFormat: string = ValueFormatter.DefaultNumericFormat;
                let alternateFormatter: number = 0;
                let multiline: any;
                let rotate: any;
                let primaryFormatter: IValueFormatter;
                let centerElemment: any;
                let textHeight: number = 0;
                centralTitleText = "";
                const textEnt = newSlice.append("text")
                .style("fill-opacity", 1)
                    .style("fill", this.settings.centralLabel.color)
                    .attr("class" , "upperCentralText")
                    .attr("transform", (d) => {
                        if (!d.depth) {
                            degree = -nintyLiteral;
                        } else {
                            degree = nintyLiteral;
                        }
                        multiline = (d.name || "").split(" ").length > 1;
                        angle = x(d.x + d.dx / twoLiteral) * oneeightyLiteral / Math.PI - nintyLiteral;
                        rotate = angle + (multiline ? -.5 : 0);

                        return rotateOpen + rotate + translate +
                         (y(d.y) + thirtyLiteral) + rotateClose + degree + closeLiteral;
                    }).attr("y", -thirtyLiteral)
                    .attr("fill", thisObj.settings.dataLabels.backgroundcolor)
                    .style("font-size", `${this.settings.centralLabel.fontSize}px`)
                    .style("font-family", this.settings.centralLabel.fontFamily)
                    .text((d) => {
                        if (!d.depth) {
                            textStrings = thisObj.settings.centralLabel.text.concat("\n");
                            textPropertiesDestSource = {
                                fontFamily: thisObj.settings.centralLabel.fontFamily,
                                fontSize: `${thisObj.settings.centralLabel.fontSize}px`,
                                text: thisObj.settings.centralLabel.text
                            };
                            centralTitleText = centralTitleText + " " + thisObj.settings.centralLabel.text;
                            totalHeight = -thirtyLiteral +
                            textMeasurementService.measureSvgTextHeight(textPropertiesDestSource);
                            return textMeasurementService.getTailoredTextOrDefault(
                                textPropertiesDestSource, d.width * tenthvalue);

                        }

                    });
                newSlice.append("text")
                    .attr("id", (index: number) => {
                        return `text-${index}`;
                    })

                    .style("fill-opacity", 1)
                    .style("fill", this.settings.centralLabel.color)
                    .attr("class" , "lowerCentralText")
                    .attr("transform", (d) => {
                        if (!d.depth) {
                            degree = -nintyLiteral;
                        } else {
                            degree = nintyLiteral;
                        }
                        multiline = (d.name || "").split(" ").length > 1;
                        angle = x(d.x + d.dx / twoLiteral) * oneeightyLiteral / Math.PI - nintyLiteral;
                        rotate = angle + (multiline ? -.5 : 0);

                        return rotateOpen + rotate + translate +
                        (y(d.y) + thirtyLiteral) + rotateClose + degree + closeLiteral;
                    }).attr("y", totalHeight)
                    .attr("fill", thisObj.settings.dataLabels.backgroundcolor)
                    .style({
                    "font-family": this.settings.centralLabel.fontFamily,
                    "font-size": `${this.settings.centralLabel.fontSize}px`
                })
                    .text((d) => {
                        if (!d.depth) {
                            textStrings = thisObj.settings.centralLabel.text.concat("\n");
                            if (!thisObj.settings.centralLabel.labelDisplayUnits) {
                                if (this.dataViews
                                    && this.dataViews.categorical
                                    && this.dataViews.categorical.values
                                    && this.dataViews.categorical.values[0]) {
                                    primaryFormat = this.dataViews.categorical.values[0].source.format ?
                                        this.dataViews.categorical.values[0].source.format
                                        : ValueFormatter.DefaultNumericFormat;
                                    alternateFormatter = String(d.value).length;
                                    if (alternateFormatter > 9) {
                                        primaryFormatterVal = 1e9;
                                    } else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                                        primaryFormatterVal = 1e6;
                                    } else if (alternateFormatter <= 6 && alternateFormatter >= 4) {
                                        primaryFormatterVal = 1e3;
                                    } else {
                                        primaryFormatterVal = 10;
                                    }
                                }
                            }
                            let titleFormatter: IValueFormatter;
                            titleFormatter = ValueFormatter.create({
                                format: options.dataViews[0].categorical.values[0].source.format ?
                                    options.dataViews[0].categorical.values[0].source.format
                                    : ValueFormatter.DefaultNumericFormat,
                            });
                            centralTitleText = centralTitleText +  " " + titleFormatter.format(d.value);
                            primaryFormatter = ValueFormatter.create({
                                format: options.dataViews[0].categorical.values[0].source.format ?
                                    options.dataViews[0].categorical.values[0].source.format
                                    : ValueFormatter.DefaultNumericFormat,
                                precision: thisObj.settings.centralLabel.labelPrecision < 0 ?
                                    0 : (thisObj.settings.centralLabel.labelPrecision) > 4 ?
                                        4 : (thisObj.settings.centralLabel.labelPrecision),
                                value: !thisObj.settings.centralLabel.labelDisplayUnits ?
                                    primaryFormatterVal : thisObj.settings.centralLabel.labelDisplayUnits
                            });
                            textPropertiesDestSource = {
                                fontFamily: thisObj.settings.centralLabel.fontFamily,
                                fontSize: `${thisObj.settings.centralLabel.fontSize}px`,
                                text: (primaryFormatter.format(d.value))
                            };
                            centerElemment = d3.selectAll("#path-0").node();
                            textHeight =
                            textMeasurementService.measureSvgTextHeight(textPropertiesDestSource);
                            // because starting from 'y' to height
                            if ( (textHeight * twoLiteral) + fiveLiteral < centerElemment.getBBox().height  ) {
                                return textMeasurementService.getTailoredTextOrDefault(
                                    textPropertiesDestSource, d.width * tenthvalue);
                            } else {
                                return "";
                            }
                        }
                    });
                // append title to central element
                newSlice.append("title")
                    // tslint:disable-next-line:no-any
                    .text((d) => {
                        if (!d.depth) {
                            return centralTitleText;
                        }
                    })
                    .classed("centralTitle" , true);
                d3.select("#text-0")
                    .attr("y", "-25");
                d3.select("#path-0")
                    .style("fill", this.settings.configuration.fill);
                d3.select("#text3").attr("fill", thisObj.settings.dataLabels.backgroundcolor);
            }
            if (this.settings.centralLabel.show) {
                this.getCentralLabel(this.dataViews);
            }
            if (this.settings.detailLabels.show) {
                lastLevelDataPoints = [];
                pathElements.each((d: any, i: number) => {
                    if (d.depth === (categoriesLength + 1)) {
                        lastLevelDataPoints.push(d);
                    }
                });
                this.addDetailLabels(lastLevelDataPoints, this.radius);
            }
            d3.selectAll(".main-arc").on("click", function(d: any): void {
                const elements: any = d3.selectAll(".main-arc")[0];
                for (const iterator of elements) {
                    iterator[dataLiteral].selected = false;
                }
                d.selected = true;
                if (thisObj.settings.animation.show) {
                    (d3.event as Event).stopPropagation();
                    d3.selectAll(".datalabels").select("textPath").style("visibility", "hidden");
                    thisObj.focusOn(d);
                    d3.selectAll(".ring_polyline").remove();
                    d3.selectAll(".ring_labelName").remove();
                    d3.selectAll(".ring_secondaryLabelName").remove();
                    lastLevelDataPoints = [];
                    if (thisObj.settings.detailLabels.show) {
                        thisObj.focusDetailOn(d);
                        thisObj.addDetailLabels(lastLevelDataPoints, thisObj.radius);
                    }
                } else {
                    thisObj.markDataPointsAsSelectedOnArc(d , elements);
                    selectionManager.clear();
                    if (d3.select(this).classed("selectedarc")) {
                        d3.selectAll(".main-arc").style("opacity", (arcpt: SelectableDataPoint) => {
                            return 1;
                        });
                        d3.selectAll(".legendItem").style("opacity", (legendpt: SelectableDataPoint) => {
                            return 1;
                        });
                        d3.select(this).classed("selectedarc", false);
                    } else {
                        selectedSelectionId = [];
                        thisObj.selectSelectionId(d);
                        selectionManager.select(selectedSelectionId).then((ids: ISelectionId[]) => {
                            d3.selectAll(".main-arc").classed("selectedarc", false);
                            d3.select(this).classed("selectedarc", true);
                            d3.selectAll(".main-arc").style("opacity", (arcPoint: SelectableDataPoint) => {
                                return (!arcPoint.selected) ? lowopacity : highopacity;
                            });
                            d3.selectAll(".legendItem").style("opacity", (legendpt: SelectableDataPoint) => {
                                const legendSelectionId: any = legendpt.identity;
                                if (legendSelectionId.includes(d.selectionId)) {
                                    return highopacity;
                                } else {
                                    return lowopacity;
                                }
                            });
                    });
                    }
                }
                (d3.event as Event).stopPropagation();
            });
            d3.selectAll("#MainSvg").on("click", (d: any): void => {
                selectionManager.clear();
                d3.selectAll(".legendItem").style("opacity", (legendpt: SelectableDataPoint) => {
                    return 1;
                });
                d3.selectAll(".main-arc").style("opacity", (arcpoint: SelectableDataPoint) => {
                    return 1;
                });
                d3.selectAll(".main-arc").classed("selectedarc", false);
                d3.selectAll(".legendItem").classed("selectedlegend", false);

                (d3.event as Event).stopPropagation();
            });
            this.addLegendSelection(globalTreeChartDataPoints);
            this.tooltipServiceWrapper.addTooltip(d3.selectAll("path.arc-path"),
                                                  (tooltipEvent: TooltipEventArgs<any>) =>
                    this.getTooltipData(tooltipEvent.data),
                                                  (tooltipEvent: TooltipEventArgs<any>) =>
                    tooltipEvent.data.selectionId);
            this.syncSelectionState(
                this.arcsSelection, this.legendPointSelection,
                this.selectionManager.getSelectionIds() as ISelectionId[], pathSelectionArray
            );
            this.events.renderingFinished(options);
            this.events.renderingFailed(options);

        }
        public addLegendSelection(dataPoints: any) {
           const behaviorOptions: ISunBurstBehaviorOptions = {
                arcSelection: d3.selectAll(".main-arc"),
                behavior: this.behavior,
                clearCatcher: d3.selectAll("#MainSvg"),
                interactivityService: this.interactivityService,
                legendSelection: d3.selectAll(".legendItem")
            };
           this.interactivityService.bind(
            globalTreeChartDataPoints,
            this.behavior,

                behaviorOptions
                );
        }
        // method to tween the arcs and datalabels on animation
        public focusOn(d) {
            // Reset to top-level if no data point specified
            const heightDataLabel: number = 0;
            let heightDataLabelTransition: number = 0;
            let demo: number = 0;
            let textPropertiesDestSourceName: TextProperties;
            const y: any = this.yScale;
            const transition = thisObj.svg.transition()
            .each("end", () => {
                // for total labels
                if (d.identity !== undefined) {
                    d3.select(".upperCentralText").style("display", "none");
                    d3.select(".lowerCentralText").style("display", "none");
                    d3.select(".centralTitle").text("");
                } else {
                    d3.select(".upperCentralText").style("display", null);
                    d3.select(".lowerCentralText").style("display", null);
                    d3.select(".centralTitle").text(centralTitleText);
                }
                d3.selectAll(".datalabels").select("textPath").style("visibility", "visible");
                d3.selectAll(".datalabels").select("textPath")
                .text((datalabel, i) => {
                    demo = Math.max(0, y(datalabel[`y`] + datalabel[`dy`])) - Math.max(0, y(datalabel[`y`]));
                    textPropertiesDestSourceName = {
                        fontFamily: thisObj.settings.dataLabels.fontFamily,
                        fontSize: `${thisObj.settings.dataLabels.fontSize}px`,
                        text: datalabel.name
                    };
                    if (datalabel.depth === 1) {
                        heightDataLabelTransition =
                            textMeasurementService.measureSvgTextHeight(textPropertiesDestSourceName);
                    }
                    // to check the height of data labels
                    if (heightDataLabelTransition + fiveLiteral < demo) {
                        return datalabel.name;
                    } else {
                        return "";
                    }

                })
                .each(thisObj.wrapPathText(fifteenLiteral));
            })
                .duration(600)
                .tween("scale", () => {
                    const xd = d3.interpolate(thisObj.xScale.domain(), [d.x, d.x + d.dx]);
                    const yd = d3.interpolate(thisObj.yScale.domain(), [d.y, 1]);
                    const yr = d3.interpolate(thisObj.yScale.range(), [d.y ? tweentyLiteral : 0, thisObj.radius]);

                    return (t) => { thisObj.xScale.domain(xd(t)); thisObj.yScale.domain(yd(t)).range(yr(t)); };
                });

            transition.selectAll("path.main-arc")
                // tslint:disable-next-line:no-shadowed-variable
                .attrTween("d", (d) => () => thisObj.arcGeneate(d));

            transition.selectAll(".main-arc-hidden")
                // tslint:disable-next-line:no-shadowed-variable
                .attrTween("d", (d) => () => {
                    return thisObj.arcGeneate(d).split("L")[0];
                });
            d3.select("#text-0")
                .attr("y", -fifteenLiteral);
            globalVisisbleArray = [];
             // store childrens and parent in array
            thisObj.visibleArrayChildren(d);
            thisObj.visibleArrayParent(d);
            thisObj.gElement.selectAll("path").style("visibility", (e) => {
                if (d === e) { return true; }
                if (globalVisisbleArray.includes(e)) {
                    return "visible";
                }
                return "hidden";
            });
        }
        // method to tween the detail labels on animation
        public focusDetailOn(d) {
            if (d.children) {
                for (const iterator of d.children) {
                    this.focusDetailOn(iterator);
                }
            } else {
                    lastLevelDataPoints.push(d);

            }
        }
        public isParentOf(p, c) {
            if (p === c) { return true; }
            if (p.children) {
                for (const iterator of p.children) {
                    return true;
                }
            }
            return false;
        }
        public isParent(p, c) {
            if (p === c) { return true; }
            if (p.parent === c) { return true; }
            if (p.children) {
                for (const iterator of p.children) {
                    this.isParent(iterator , c);
                }
            }
            return false;
        }
        // method to calculate mid angle
        public midAngle(d: any): any { return d.startAngle + ((d.endAngle - d.startAngle)) / 2; }
        // method to add Detail Labels
        // tslint:disable-next-line:cyclomatic-complexity
        public addDetailLabels(data: any, radius: any) {
            // tslint:disable-next-line:no-any
            const pie: any = d3.layout.pie()
                .sort(null)
                // tslint:disable-next-line:no-any
                .value((d: any): any => Math.abs(d.value));
            // tslint:disable-next-line:no-any
            const enteringLabels: any = thisObj.svg.selectAll(".ring_polyline").data(pie(data)).enter();
            const outerArc = d3.svg.arc().outerRadius(radius * 1.04)
                .innerRadius(radius * 1.04);
            const innerarc = d3.svg.arc().outerRadius(radius)
                .innerRadius(radius * 0.85);
            // tslint:disable-next-line:no-any
            const labelGroups: any = enteringLabels.append("g")
                .attr("class", "ring_polyline");
            // tslint:disable-next-line:no-any
            let line: any;
            let arccentroid: any;
            let pos: any;
            let pos1: any;
            let fpos: number[];
            let fpos1: number[];
            line = labelGroups.append("polyline")
                // tslint:disable-next-line:no-any
                .attr("points", (d: any): any => {
                    // tslint:disable-next-line:no-any
                    arccentroid = innerarc.centroid(d);
                    pos = outerArc.centroid(d);
                    pos1 = outerArc.centroid(d);
                    pos[0] = (Math.abs(pos1[0]) + tenthvalue) * (thisObj.midAngle(d) < Math.PI ? 1 : -1);
                    fpos = [(arccentroid[0] + pos1[0]) / twoLiteral, (arccentroid[1] + pos1[1]) / twoLiteral];
                    fpos1 = [(fpos[0] + pos1[0]) / twoLiteral, (fpos[1] + pos1[1]) / twoLiteral];

                    return [fpos1, pos1, pos];
                })
                // tslint:disable-next-line:no-any
                .attr("id", (d: any, i: number): string => {
                    return `ring_polyline_${i}`;
                });
            const detaillabelprop: IDetailLables = this.getDetailLable(this.dataViews);
            const centralLabelprop: CentralLabel = this.getCentralLabel(this.dataViews);

            // tslint:disable-next-line:no-any
            const enteringtext: any = thisObj.svg.selectAll(".ring_labelName").data(pie(data)).enter();
            // tslint:disable-next-line:no-any
            const textGroups: any = enteringtext.append("g").attr("class", "ring_labelName");
            const lablesettings: any = thisObj.settings.detailLabels;
            const labelcolor: string = lablesettings.color;
            const labeltextsize: string = (lablesettings.fontSize) + "px";
            const defaultFontFamily = "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif";
            let primaryFormatter: string = ValueFormatter.DefaultNumericFormat;
            let primaryFormatterVal: number = 0;
            let alternateFormatter: number;
            let text: string = "";
            let textEnd: number;
            let finalText: string;
            let formatter: IValueFormatter;
            let summaryvalue: number = 0 ;
            let val: string = "";
            let val1: string = "" ;
            let val2: string = "";
            let cat: string = "";
            let percentVal: string = "";
            let textProperties: TextProperties;
            let widthOfText: number = 0;
            let position: number = 0;
            let widthOfText1: number = 0;
            let textEnd1: number = 0;
            // tslint:disable-next-line:no-any
            const label: any = textGroups
                .append("text")
                // tslint:disable-next-line:no-any
                .attr("x", (d: any): number => {
                 pos = outerArc.centroid(d);
                 pos[0] = (Math.abs(
                        outerArc.centroid(d)[0]) + tweentyLiteral) * (thisObj.midAngle(d) < Math.PI ? 1 : -1);

                 return pos[0];
                })
                // tslint:disable-next-line:no-any
                .attr("y", (d: any): number => {
                     pos = outerArc.centroid(d);

                     return pos[1];
                })
                .attr("dy", ".20em")
                // tslint:disable-next-line:no-any
                .attr("id", (d: any, i: number): string => {
                    return `ring_label_${i}`;
                })
                // tslint:disable-next-line:cyclomatic-complexity
                .text((d: any): string => {
                    if (thisObj.dataViews
                        && thisObj.dataViews.categorical
                        && thisObj.dataViews.categorical.values
                        && thisObj.dataViews.categorical.values[0]) {
                        primaryFormatter = thisObj.dataViews.categorical.values[0].source.format ?
                            thisObj.dataViews.categorical.values[0].source.format : ValueFormatter.DefaultNumericFormat;
                    }
                    if (!detaillabelprop.labelDisplayUnits) {
                        alternateFormatter = parseInt(d.data.value, tenthvalue).toString().length;
                        if (alternateFormatter > 9) {
                            primaryFormatterVal = 1e9;
                        } else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                            primaryFormatterVal = 1e6;
                        } else if (alternateFormatter <= 6 && alternateFormatter >= 4) {
                            primaryFormatterVal = 1e3;
                        } else {
                            primaryFormatterVal = 10;
                        }
                    }

                    formatter = ValueFormatter.create({
                        format: primaryFormatter,
                        precision: detaillabelprop.labelPrecision,
                        value: !detaillabelprop.labelDisplayUnits ?
                            primaryFormatterVal : detaillabelprop.labelDisplayUnits
                    });
                    summaryvalue = thisObj.data.value;
                    if (detaillabelprop.labelStyle === "Data") {
                        text = formatter.format((d.value));
                    } else if (detaillabelprop.labelStyle === "Category") {
                        text = d.data.name;
                    } else if (detaillabelprop.labelStyle === "Percent of total") {
                         val = (d.data.value / summaryvalue * hundredLiteral)
                            .toFixed(detaillabelprop.labelPrecision).toString();
                         text = `${val}%`;
                    } else if (detaillabelprop.labelStyle === "Category, percent of total") {
                        val =
                            (d.data.value / summaryvalue * hundredLiteral).toFixed(twoLiteral).toString();
                        text = `${d.data.name} ${val}%`;
                    } else if (detaillabelprop.labelStyle === "Data value, percent of total") {
                        val1 = formatter.format(d.data.value);
                        val2 =
                            (d.data.value / summaryvalue * hundredLiteral).toFixed(twoLiteral).toString();
                        text = `${val1} (${val2}%)`;
                    } else if (detaillabelprop.labelStyle === "Both") {
                        val = formatter.format(d.data.value);
                        text = `${d.data.name} ${val}`;
                    } else {
                        cat = d.data.name;
                        val = formatter.format(d.data.value);
                        percentVal =
                            (d.data.value / summaryvalue * hundredLiteral).toFixed(twoLiteral).toString();
                        text = `${cat} ${val} (${percentVal}%)`;
                    }

                    textProperties = {
                        fontFamily: thisObj.defaultFontFamily,
                        fontSize: (detaillabelprop.fontSize) + "px",
                        text
                    };
                    widthOfText = textMeasurementService.measureSvgTextWidth(textProperties);
                    pos = outerArc.centroid(d);

                    pos[0] = (Math.abs(
                        outerArc.centroid(d)[0]) + tweentyLiteral) * (thisObj.midAngle(d) < Math.PI ? 1 : -1);

                    // logic to show ellipsis in Data Labels if there is no enough width
                    position = (thisObj.midAngle(d) < Math.PI ? 1 : -1);
                    if (position === 1) {
                        textEnd = pos[0] + widthOfText;
                        if (textEnd > width / twoLiteral) {
                            finalText =
                            textMeasurementService.getTailoredTextOrDefault(textProperties, width / 2 - pos[0]);
                            if (finalText.length < 4) {
                                return "";
                            }
                        } else {
                            finalText =
                            textMeasurementService.getTailoredTextOrDefault(textProperties, textEnd);
                        }
                    } else if (position === -1) {
                        textEnd = pos[0] + (-1 * widthOfText);
                        if (textEnd < (-1 * width / twoLiteral)) {
                            finalText =
                            textMeasurementService.getTailoredTextOrDefault(
                                textProperties, pos[0] + width / twoLiteral);
                            if (finalText.length < 4) {
                                return "";
                            }
                        } else {
                            finalText =
                            textMeasurementService.getTailoredTextOrDefault(textProperties, Math.abs(textEnd));
                        }
                    }
                    if (finalText.indexOf("...") > -1
                        && detaillabelprop.labelStyle !== "Data"
                        && detaillabelprop.labelStyle !== "Category"
                        && detaillabelprop.labelStyle !== "Percent of total") {

                        let firstRowLabel: string;
                        if (detaillabelprop.labelStyle === "Data value, percent of total") {
                            firstRowLabel = formatter.format(d.data.value);
                        } else {
                            firstRowLabel = d.data.name;
                        }

                        textProperties.text = firstRowLabel;
                        widthOfText1 = textMeasurementService.measureSvgTextWidth(textProperties);
                        if (position === 1) {
                            textEnd1 = pos[0] + widthOfText1;
                            if (textEnd1 > width / twoLiteral) {
                                finalText =
                                    textMeasurementService.getTailoredTextOrDefault(
                                        textProperties, width / twoLiteral - pos[0]);
                                if (finalText.length < 4) {
                                    return "";
                                }
                            } else {
                                finalText =
                                    textMeasurementService.getTailoredTextOrDefault(textProperties, textEnd1);
                            }
                        } else if (position === -1) {
                            textEnd1 = pos[0] + (-1 * widthOfText1);
                            if (textEnd1 < (-1 * width / twoLiteral)) {
                                finalText =
                                    textMeasurementService.getTailoredTextOrDefault(
                                        textProperties, pos[0] + width / twoLiteral);
                                if (finalText.length < 4) {
                                    return "";
                                }
                            } else {
                                finalText =
                                    textMeasurementService.getTailoredTextOrDefault(textProperties, Math.abs(textEnd1));
                            }
                        }
                    }

                    return finalText;
                })
                .style(
                    // tslint:disable-next-line:no-any
                    "text-anchor", (d: any): string => {
                        return (thisObj.midAngle(d)) < Math.PI ? "start" : "end";
                    })
                .style({"fill": labelcolor,
                "font-family": defaultFontFamily,
                "font-size": labeltextsize,
            })
                .append("title")
                // tslint:disable-next-line:no-any
                .text((d: any): string => {
                    if (thisObj.dataViews
                        && thisObj.dataViews.categorical
                        && thisObj.dataViews.categorical.values
                        && thisObj.dataViews.categorical.values[0]) {
                        primaryFormatter = thisObj.dataViews.categorical.values[0].source.format ?
                            thisObj.dataViews.categorical.values[0].source.format : ValueFormatter.DefaultNumericFormat;
                    }
                    if (!detaillabelprop.labelDisplayUnits) {
                        if (alternateFormatter > 9) {
                            primaryFormatterVal = 1e9;
                        } else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                            primaryFormatterVal = 1e6;
                        } else if (alternateFormatter <= 6 && alternateFormatter >= 4) {
                            primaryFormatterVal = 1e3;
                        } else {
                            primaryFormatterVal = 10;
                        }
                    }

                    formatter = ValueFormatter.create({
                        format: primaryFormatter,
                        precision: detaillabelprop.labelPrecision,
                        value: !detaillabelprop.labelDisplayUnits ?
                        primaryFormatterVal : detaillabelprop.labelDisplayUnits
                    });
                    summaryvalue = thisObj.data.value;
                    if (detaillabelprop.labelStyle === "Data") {
                        text = formatter.format((d.value));
                    } else if (detaillabelprop.labelStyle === "Category") {
                        text = d.data.name;
                    } else if (detaillabelprop.labelStyle === "Percent of total") {
                         val = (d.data.value / summaryvalue * hundredLiteral)
                            .toFixed(detaillabelprop.labelPrecision).toString();
                         text = `${val}%`;
                    } else if (detaillabelprop.labelStyle === "Category, percent of total") {
                        val =
                            (d.data.value / summaryvalue * hundredLiteral).toFixed(twoLiteral).toString();
                        text = `${d.data.name} ${val}%`;
                    } else if (detaillabelprop.labelStyle === "Data value, percent of total") {
                        val1 = formatter.format(d.data.value);
                        val2 =
                            (d.data.value / summaryvalue * hundredLiteral).toFixed(twoLiteral).toString();
                        text = `${val1} (${val2}%)`;
                    } else if (detaillabelprop.labelStyle === "Both") {
                        val = formatter.format(d.data.value);
                        text = `${d.data.name} ${val}`;
                    } else {
                        cat = d.data.name;
                        val = formatter.format(d.data.value);
                        percentVal =
                            (d.data.value / summaryvalue * hundredLiteral).toFixed(twoLiteral).toString();
                        text = `${cat} ${val} (${percentVal}%)`;
                    }

                    return text;
                });
            // Logic to add second row labels
            const dataLabels: d3.Selection<SVGElement> = this.svg.selectAll("g.ring_labelName text");
            let enteringSecondRowtext: any;
            // tslint:disable-next-line:no-any
            let secondarytextGroups: any;
            let labelcolor2: string = "";
            let labeltextsize2: string = "";
            // tslint:disable-next-line:no-any
            const dataLabelsArr: any = dataLabels && dataLabels[0] ? dataLabels[0] : [];
            for (const iterator of dataLabelsArr) {
                if (detaillabelprop.labelStyle !== "Data" && detaillabelprop.labelStyle !== "Category"
                    && detaillabelprop.labelStyle !== "Percent of total") {
                    enteringSecondRowtext =
                        thisObj.svg.selectAll(".ring_secondaryLabelName").data(pie(data)).enter();
                    secondarytextGroups =
                        enteringSecondRowtext.append("g").attr("class", "ring_secondaryLabelName");
                    labelcolor2 = lablesettings.color;
                    labeltextsize2 = (lablesettings.fontSize) + "px";

                    // tslint:disable-next-line:no-any
                    const secondRowLabel: any = secondarytextGroups
                        .append("text")
                        // tslint:disable-next-line:no-any
                        .attr("x", (d: any): number => {
                            pos = outerArc.centroid(d);
                            pos[0] =
                            (Math.abs(
                                outerArc.centroid(d)[0]) + tweentyLiteral) * (thisObj.midAngle(d) < Math.PI ? 1 : -1);

                            return pos[0];
                        })
                        // tslint:disable-next-line:no-any
                        .attr("y", (d: any): number => {
                            pos = outerArc.centroid(d);
                            text = d && d.data && d.data.name ? d.data.name : "sample";
                            textProperties = {
                                fontFamily: thisObj.defaultFontFamily,
                                fontSize: (detaillabelprop.fontSize) + "px",
                                text
                            };
                            const heightOfText: number = textMeasurementService.measureSvgTextHeight(textProperties);

                            return pos[1] + heightOfText / twoLiteral + fiveLiteral;
                        })
                        .attr("dy", ".20em")
                        // tslint:disable-next-line:no-any
                        .attr("id", (d: any, j: number): string => {
                            return `ring_secondRowLabel_${j}`;
                        })
                        // tslint:disable-next-line:no-any
                        // tslint:disable-next-line:cyclomatic-complexity
                        .text((d: any): string => {
                            if (thisObj.dataViews
                                && thisObj.dataViews.categorical
                                && thisObj.dataViews.categorical.values
                                && thisObj.dataViews.categorical.values[0]) {
                                primaryFormatter = thisObj.dataViews.categorical.values[0].source.format ?
                                    thisObj.dataViews.categorical.values[0].source.format
                                    : ValueFormatter.DefaultNumericFormat;
                            }
                            if (!detaillabelprop.labelDisplayUnits) {
                                if (alternateFormatter > 9) {
                                    primaryFormatterVal = 1e9;
                                } else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                                    primaryFormatterVal = 1e6;
                                } else if (alternateFormatter <= 6 && alternateFormatter >= 4) {
                                    primaryFormatterVal = 1e3;
                                } else {
                                    primaryFormatterVal = 10;
                                }
                            }

                            formatter = ValueFormatter.create({
                                format: primaryFormatter,
                                precision: detaillabelprop.labelPrecision,
                                value: !detaillabelprop.labelDisplayUnits ?
                                    primaryFormatterVal : detaillabelprop.labelDisplayUnits
                            });
                            summaryvalue = thisObj.data.value;
                            if (detaillabelprop.labelStyle === "Category, percent of total") {
                                percentVal = (d.data.value / summaryvalue * hundredLiteral)
                                    .toFixed(twoLiteral).toString();
                                text = `${percentVal}%`;
                            } else if (detaillabelprop.labelStyle === "Data value, percent of total") {
                                percentVal = (d.data.value / summaryvalue * hundredLiteral)
                                    .toFixed(twoLiteral).toString();
                                text = `(${percentVal}%)`;
                            } else if (detaillabelprop.labelStyle === "Both") {
                                text = `${formatter.format(d.data.value)}`;
                            } else {
                                percentVal = (d.data.value / summaryvalue * hundredLiteral)
                                    .toFixed(twoLiteral).toString();
                                text = `${formatter.format(d.data.value)} (${percentVal}%)`;
                            }

                            textProperties = {
                                fontFamily: thisObj.defaultFontFamily,
                                fontSize: (detaillabelprop.fontSize) + "px",
                                text
                            };
                            widthOfText = textMeasurementService.measureSvgTextWidth(textProperties);
                            pos = outerArc.centroid(d);
                            pos[0] =
                            (Math.abs(
                                outerArc.centroid(d)[0]) + tweentyLiteral) * (thisObj.midAngle(d) < Math.PI ? 1 : -1);
                            // logic to show ellipsis in Data Labels if there is no enough width
                            position = (thisObj.midAngle(d) < Math.PI ? 1 : -1);
                            if (position === 1) {
                                textEnd = pos[0] + widthOfText;
                                if (textEnd > width / twoLiteral) {
                                    finalText = textMeasurementService
                                        .getTailoredTextOrDefault(textProperties, width / twoLiteral - pos[0]);
                                    if (finalText.length < 4) {
                                        return "";
                                    }
                                } else {
                                    finalText =
                                    textMeasurementService.getTailoredTextOrDefault(textProperties, textEnd);
                                }
                            } else if (position === -1) {
                                textEnd = pos[0] + (-1 * widthOfText);
                                if (textEnd < (-1 * width / twoLiteral)) {
                                    finalText = textMeasurementService.
                                        getTailoredTextOrDefault(textProperties, pos[0] + width / twoLiteral);
                                    if (finalText.length < 4) {
                                        return "";
                                    }
                                } else {
                                    finalText =
                                    textMeasurementService.getTailoredTextOrDefault(textProperties, Math.abs(textEnd));
                                }
                            }

                            return finalText;
                        })
                        .style(
                            // tslint:disable-next-line:no-any
                            "text-anchor", (d: any): string => {
                                return (thisObj.midAngle(d)) < Math.PI ? "start" : "end";
                            })
                        .style({"fill": labelcolor2,
                        "font-family": defaultFontFamily,
                        "font-size": labeltextsize2,
                    })
                        .append("title")
                        // tslint:disable-next-line:no-any
                        .text((d: any): string => {
                            if (thisObj.dataViews
                                && thisObj.dataViews.categorical
                                && thisObj.dataViews.categorical.values
                                && thisObj.dataViews.categorical.values[0]) {
                                primaryFormatter = thisObj.dataViews.categorical.values[0].source.format ?
                                    thisObj.dataViews.categorical.values[0].source.format
                                    : ValueFormatter.DefaultNumericFormat;
                            }
                            if (!detaillabelprop.labelDisplayUnits) {
                                if (alternateFormatter > 9) {
                                    primaryFormatterVal = 1e9;
                                } else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                                    primaryFormatterVal = 1e6;
                                } else if (alternateFormatter <= 6 && alternateFormatter >= 4) {
                                    primaryFormatterVal = 1e3;
                                } else {
                                    primaryFormatterVal = 10;
                                }
                            }

                            formatter = ValueFormatter.create({
                                format: primaryFormatter,
                                precision: detaillabelprop.labelPrecision,
                                value: !detaillabelprop.labelDisplayUnits ?
                                    primaryFormatterVal : detaillabelprop.labelDisplayUnits
                            });
                            summaryvalue = thisObj.data.value;
                            if (detaillabelprop.labelStyle === "Category, percent of total") {
                                percentVal = (d.data.value / summaryvalue * hundredLiteral)
                                    .toFixed(twoLiteral).toString();
                                text = `${percentVal}%`;
                            } else if (detaillabelprop.labelStyle === "Data value, percent of total") {
                                percentVal = (d.data.value / summaryvalue * hundredLiteral)
                                    .toFixed(twoLiteral).toString();
                                text = `(${percentVal}%)`;
                            } else if (detaillabelprop.labelStyle === "Both") {
                                text = `${formatter.format(d.data.value)}`;
                            } else {
                                percentVal = (d.data.value / summaryvalue * hundredLiteral)
                                    .toFixed(twoLiteral).toString();
                                text = `${formatter.format(d.data.value)} (${percentVal}%)`;
                            }

                            return text;
                        });
                    const upperLabelText: string = dataLabelsArr[iterator]
                        && dataLabelsArr[iterator].childNodes
                        && dataLabelsArr[iterator].childNodes[0]
                        && dataLabelsArr[iterator].childNodes[0].textContent ?
                        dataLabelsArr[iterator].childNodes[0].textContent : "no data";
                    let expString: string = "";
                    if (detaillabelprop.labelStyle === "Category, percent of total"
                        || detaillabelprop.labelStyle === "Both") {
                        expString = "(.*)\\s(.+)";
                    } else if (detaillabelprop.labelStyle === "Data value, percent of total") {
                        expString = "(.*)\\s\\((.+)\\)";
                    } else {
                        expString = "(.*)\\s(.+)\\s\\((.+)\\)";
                    }
                    const pattern: RegExp = new RegExp(expString, "gi");
                    // checking the pattern of the data label inorder to display or not
                    if (!(upperLabelText && upperLabelText.indexOf("...") > -1) && pattern.test(upperLabelText)) {
                        d3.select(`#ring_secondRowLabel_${dataLabelsArr[iterator]}`).style("display" , "none");
                    }
                }
            }
            const labelsLength: number = data.length;
            // for last stage of animation
            if (labelsLength !== 1) {
                let obj1: any;
                let obj2: ClientRect;
                let obj3: ClientRect;
                let rectVariable: any;
                let rectVariable2: any;
                let rectVariable3: any;
                for (let iterator: number = 0; iterator < labelsLength; iterator++) {
                    rectVariable = d3.select("#ring_label_" + iterator)[0][0];
                    obj1 = rectVariable.getBoundingClientRect();
                    for (let jiterator: number = iterator + 1; jiterator <= labelsLength - 1; jiterator++) {
                        rectVariable2 = d3.select(`#ring_label_${jiterator}`)[0][0];
                        obj2 = rectVariable2.getBoundingClientRect();
                        let condExpr: boolean = !(obj2.left > obj1.right ||
                            obj2.right < obj1.left ||
                            obj2.top > obj1.bottom ||
                            obj2.bottom < obj1.top);
                        if (detaillabelprop.labelStyle !== "Data"
                            && detaillabelprop.labelStyle !== "Category"
                            && detaillabelprop.labelStyle !== "Percent of total") {
                            rectVariable3 = d3.select(`#ring_secondRowLabel_${iterator}`)[0][0];
                            obj3 = rectVariable3.getBoundingClientRect();
                            condExpr = !(obj2.left > obj1.right ||
                                obj2.right < obj1.left ||
                                obj2.top > obj1.bottom ||
                                obj2.bottom < obj1.top)
                                ||
                                (!(obj2.left > obj3.right ||
                                    obj2.right < obj3.left ||
                                    obj2.top > obj3.bottom ||
                                    obj2.bottom < obj3.top)
                                    && !!d3.select(`#ring_secondRowLabel_${iterator}`)
                                    && document.getElementById(`ring_secondRowLabel_${iterator}`)
                                    .style.display !== "none");
                            if (!condExpr) {
                                rectVariable3 = d3.select(`#ring_secondRowLabel_${jiterator}`)[0][0];
                                obj3 = rectVariable3.getBoundingClientRect();
                                condExpr = (!(obj1.left > obj3.right ||
                                    obj1.right < obj3.left ||
                                    obj1.top > obj3.bottom ||
                                    obj1.bottom < obj3.top)
                                    && !!d3.select(`#ring_secondRowLabel_${jiterator}`)
                                    && document.getElementById(`ring_secondRowLabel_${jiterator}`)
                                        .style.display !== "none");
                            }
                        }
                        if (condExpr) {
                            d3.select(`#ring_label_${jiterator}`).style("display", "none");
                            d3.select(`#ring_polyline_${jiterator}`).style("display", "none");
                            if (d3.select(`#ring_secondRowLabel_${jiterator}`)) {
                                d3.select(`#ring_secondRowLabel_${jiterator}`).style("display", "none");
                            }
                        }
                    }
                    const legendPos: string = LegendPosition[this.legend.getOrientation()].toLowerCase();
                    if (d3.select(`#ring_label_${iterator}`)[0][0][`childNodes`].length <= 1) {
                        d3.select(`#ring_label_${iterator}`).style("display", "none");
                        d3.select(`#ring_polyline_${iterator}`).style("display", "none");
                        if (d3.select(`#ring_secondRowLabel_${iterator}`)) {
                            d3.select(`#ring_secondRowLabel_${iterator}`).style("display", "none");
                        }
                    }
                    // code to handle condition when it overlaps at bottom. It is compared with svg height
                    if (obj1.y + obj1.height > height) {
                        d3.select(`#ring_label_${iterator}`).style("display", "none");
                        d3.select(`#ring_polyline_${iterator}`).style("display", "none");
                        if (d3.select(`#ring_secondRowLabel_${iterator}`)) {
                            d3.select(`#ring_secondRowLabel_${iterator}`).style("display", "none");
                        }
                    }
                    // code to handle data labels cutting issue in top and bottom positions
                    let labelYPos: number = 0;
                    let secondLabelYPos: number = 0;
                    labelYPos = parseFloat($(`#ring_label_${iterator}`).attr("y"));
                    if (labelYPos && labelYPos < 0) {
                        labelYPos = labelYPos * 0.9;
                        labelYPos =
                            labelYPos - obj1.height + 3; // 0.2em is the dy value. On conversion to px it will be 3px
                        labelYPos = Math.abs(labelYPos);
                    } else {
                        labelYPos = (labelYPos * 0.9) + 3; // 0.2em is the dy value. On conversion to px it will be 3px
                    }
                    secondLabelYPos = Math.abs(parseFloat($(`#ring_secondRowLabel_${iterator}`).attr("y"))) ?
                        Math.abs(parseFloat($(`#ring_secondRowLabel_${iterator}`).attr("y"))) + 3 : 0;
                    // 0.2em is the dy value. On conversion to px it will be 3px
                    const visualHeight: number = height / twoLiteral * 0.9;
                    // 0.9 is the random value for adjusting labels cropping issue
                    if (labelYPos > parseFloat(visualHeight.toString())
                        || (secondLabelYPos > parseFloat(visualHeight.toString()))
                        && d3.select(`#ring_secondRowLabel_${iterator}`)
                        && document.getElementById(`ring_secondRowLabel_${iterator}`).style.display !== "none") {
                        d3.select(`#ring_label_${iterator}`).style("display", "none");
                        d3.select(`#ring_polyline_${iterator}`).style("display", "none");
                        if (d3.select(`#ring_secondRowLabel_${iterator}`)) {
                            d3.select(`#ring_secondRowLabel_${iterator}`).style("display", "none");
                        }
                    }
                }
            }
        }
        public getArcColor(color: any, index: number) {
            return d3.rgb(color).brighter(index / twoLiteral);

        }
        /**
         * This function gets called for each of the
         * objects defined in the capabilities files and allows you to select which of the
         * objects and properties you want to expose to the users in the property pane.
         *
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[]
            | VisualObjectInstanceEnumerationObject {
            const objectName: string = options.objectName;
            const objectEnumeration: VisualObjectInstance[] = [];
            // tslint:disable-next-line: object-literal-sort-keys
            switch (objectName) {
                case "legend":
                    if (this.settings.legend.show) {
                        objectEnumeration.push({
                            objectName,
                            properties: {
                                fontSize: this.settings.legend.fontSize,
                                show: this.settings.legend.show,
                                title: this.settings.legend.title
                            },
                            selector: null,
                        });
                        if (this.settings.legend.title) {
                            objectEnumeration.push({
                                objectName,
                                properties: {
                                    titleText: this.settings.legend.titleText === "" ?
                                    legendDisplay : this.settings.legend.titleText
                                },
                                selector: null,
                            });
                        }
                        objectEnumeration.push({
                            objectName,
                            properties: {
                                color: this.settings.legend.color,
                                position: this.settings.legend.position
                            },
                            selector: null,
                        });
                    } else {
                        objectEnumeration.push({
                            objectName,
                            properties: {
                                show: this.settings.legend.show
                            },
                            selector: null,
                        });
                    }

                    return objectEnumeration;
                case "colorSelector":
                    for (const count of this.legendDataPoints.dataPoints) {
                        objectEnumeration.push({
                            displayName: count.label,
                            objectName,
                            properties: {
                                fill: {
                                    solid: {
                                        color: count.color
                                    }
                                }
                            },
                            selector: count.identity.getSelector()
                        });
                    }

                    return objectEnumeration;
                case "dataLabels":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            show: this.settings.dataLabels.show
                        },
                        selector: null,
                    });
                    if (this.settings.dataLabels.show) {
                        objectEnumeration.push({
                            objectName,
                            properties: {
                                backgroundcolor: this.settings.dataLabels.backgroundcolor,
                                color: this.settings.dataLabels.color,
                                fontFamily: this.settings.dataLabels.fontFamily,
                                fontSize: this.settings.dataLabels.fontSize,
                            },
                            selector: null,
                        });
                    }

                    return objectEnumeration;
                case "detailLabels":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            show: this.settings.detailLabels.show
                        },
                        selector: null,
                    });
                    if (this.settings.detailLabels.show) {
                        objectEnumeration.push({
                            objectName,
                            properties: {
                                color: this.settings.detailLabels.color,
                                fontSize: this.settings.detailLabels.fontSize,
                                labelDisplayUnits: this.settings.detailLabels.labelDisplayUnits,
                                labelPrecision: this.limitValue(this.lowerLimitValue
                                    (this.settings.detailLabels.labelPrecision , 0),
                                                             4),
                                labelStyle: this.settings.detailLabels.labelStyle,
                            },
                            selector: null,
                        });
                    }

                    return objectEnumeration;
                case "centralLabel":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            show: this.settings.centralLabel.show
                        },
                        selector: null,
                    });
                    if (this.settings.centralLabel.show) {
                        objectEnumeration.push({
                            objectName,
                            properties: {
                                color: this.settings.centralLabel.color,
                                fontFamily: this.settings.centralLabel.fontFamily,
                                fontSize: this.settings.centralLabel.fontSize,
                                labelDisplayUnits: this.settings.centralLabel.labelDisplayUnits,
                                labelPrecision: this.limitValue(this.lowerLimitValue
                                    (this.settings.centralLabel.labelPrecision , 0),
                                                             4),
                                show: this.settings.centralLabel.show,
                                text: this.settings.centralLabel.text
                            },
                            selector: null,
                        });
                    }
                    return objectEnumeration;
                case "animation":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            show: this.settings.animation.show
                        },
                        selector: null,
                    });

                    return objectEnumeration;
                case "configuration":
                    objectEnumeration.push({
                        objectName,
                        properties: {
                            arcradius : this.checkRadius(),
                            cornerradius : Number(this.limitValue(this.lowerLimitValue
                                (this.settings.configuration.cornerradius , 0),
                                tenthvalue).toFixed(twoLiteral)),
                            padding : Number(this.limitValue(this.lowerLimitValue
                                (this.settings.configuration.padding , 0),
                                tenthvalue).toFixed(twoLiteral)),
                            strokecolor: this.settings.configuration.strokecolor,

                            fill: this.settings.configuration.fill,
                        },
                        selector: null,
                    });
                    return objectEnumeration;

                default: break;
            }

            return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        }
        // tslint:enable

        private HandleLandingPage(options: VisualUpdateOptions): void {
            if (!options.dataViews || !options.dataViews.length) {
                if (!thisObj.isLandingPageOn) {
                    thisObj.isLandingPageOn = true;
                    const sampleLandingPage: Element = this.createsampleLandingPage();
                    thisObj.landingPage = d3.select(".LandingPage");
                }
            } else {
                if (thisObj.isLandingPageOn && !thisObj.landingPageRemoved) {
                    thisObj.landingPageRemoved = true;
                    thisObj.landingPage.remove();
                }
            }
        }
        // method to create Landing Page
        private createsampleLandingPage(): Element {
            // tslint:disable-next-line:no-any
            const page: any = d3.select(this.optionsUpdate.element)
                .append("div")
                .classed("LandingPage", true);

            page.append("text")
                .classed("landingPageHeader", true)
                .text("Sunburst Chart by MAQ Software")
                .append("text")
                .classed("landingPageText", true)
// tslint:disable-next-line: max-line-length
                .text("Sunburst Chart visual categorizes the data into the groups and show the data in Hierarchical structure");

            return page;
        }
        // method to sync the previous selected state on bookmarks.
        private syncSelectionState(
            selection: d3.Selection<any>,
            legendSelection: d3.Selection<any>,
            selectionIds: ISelectionId[],
            // tslint:disable-next-line: no-shadowed-variable
            pathSelectionArray: any
        ): void {
            if (!selection || !selectionIds.length) {
                return;
            }
            if (!selectionIds.length) {
                selection.style("fill-opacity", null);
                return;
            }
            const self: this = this;
            let legendPointString: string = "";
            let isSelected: boolean = false;
            for (const iterator of pathSelectionArray) {
                isSelected = self.isSelectionIdInArray(selectionIds, iterator.selection);
                if (isSelected) {
                    legendPointString = iterator.path[dataLiteral].legendClass;
                }
                d3.select(iterator.path).style(
                    "opacity",
                    isSelected
                        ? highopacity
                        : lowopacity
                );
            }
            let isLegendSelected: boolean = false;
            legendSelection.each(function(legendPoint: any) {
                isLegendSelected = false;
                if (legendPoint.tooltip === legendPointString) {
                    isLegendSelected = true;
                }
                d3.select(this).style(
                    "opacity",
                    isLegendSelected
                        ? highopacity
                        : lowopacity
                );
            });
        }
        private visibleArrayChildren(d: any) {
            if (d.children) {
                for (const iterator of d.children) {
                    globalVisisbleArray.push(iterator);
                    this.visibleArrayChildren(iterator);
                }
            }
        }
        private visibleArrayParent(d: any) {
            if (d.parent) {
                globalVisisbleArray.push(d.parent);
            }
        }

        // method to check whether selection Ids is present or not
        private isSelectionIdInArray(selectionIds: ISelectionId[], selectionId: any): boolean {
            if (!selectionIds || !selectionId) {
                return false;
            }
            let selectedVariable: boolean = false;
            return selectionIds.some((currentSelectionId: any) => { // for selected selection ids
                for (const iterator of selectionId) { // to match with path elements
                    selectedVariable = currentSelectionId.includes(iterator);
                    // if true found than break the loop
                    if (selectedVariable) {
                        break;
                    }
                }
                return selectedVariable;
            });
        }
        // method to set the property selected on click of the arc
        private markDataPointsAsSelectedOnArc(d: any , root: any): void {
// tslint:disable-next-line: prefer-for-of
            for (let iterator: number = 0 ; iterator < root.length ; iterator++) {
                if ( d.parent === root[iterator][dataLiteral] ) {
                    root[iterator][dataLiteral].selected = true;
                    }
            }
            if (d.parent.name !== "") {
                this.markDataPointsAsSelectedOnArc(d.parent , root);
            }
        }
         // method to set the property selected on click of the legend
        private markLegendPointsAsSelectedOnArc(d: any , root: any): void {
// tslint:disable-next-line: prefer-for-of
            for (let iterator: number = 0 ; iterator < root.length ; iterator++) {
                root[iterator][dataLiteral].selected = false;
                if ( d.tooltip ===  root[iterator][dataLiteral].legendClass) {
                    root[iterator][dataLiteral].selected = true;
                    }
            }
        }
        // method to get the Default Detail Labels Settings
        private getDefaultDetailLable(): IDetailLables {

            return  {
                color: "#808080",
                fontSize: 9,
                labelDisplayUnits: 0,
                labelPrecision: 0,
                labelStyle: "Category",
                show: true
            } as IDetailLables ;
        }
         // method to get the Default Central Labels Settings
        private getDefaultCentralLabel(): CentralLabel {
            return {
                color: "#808080",
                fontSize: 11,
                labelDisplayUnits: 0,
                labelPrecision: 0,
                show: true,
                text: "Total",
            } as CentralLabel ;
        }
        // method to get the Detail Labels Settings
        private getDetailLable(dataView: DataView): IDetailLables {
            let objects: DataViewObjects = null;
            const labelSettings: IDetailLables  = this.getDefaultDetailLable();
            if (!dataView.metadata || !dataView.metadata.objects) {
                return this.getDefaultDetailLable();
            }
            objects = dataView.metadata.objects;
            labelSettings.show = thisObj.settings.detailLabels.show;
            labelSettings.color = thisObj.settings.detailLabels.color;
            labelSettings.labelDisplayUnits = thisObj.settings.detailLabels.labelDisplayUnits;
            labelSettings.labelPrecision = thisObj.settings.detailLabels.labelPrecision;
            labelSettings.labelPrecision = labelSettings.labelPrecision < 0 ?
                0 : (labelSettings.labelPrecision) > 4 ? 4 : (labelSettings.labelPrecision);
            labelSettings.fontSize = thisObj.settings.detailLabels.fontSize;
            labelSettings.labelStyle = thisObj.settings.detailLabels.labelStyle;

            return labelSettings;
        }
        // method to get the Central Labels Settings
        private getCentralLabel(dataView: DataView): CentralLabel {
            let objects: DataViewObjects = null;
            const centralLabelSettings: CentralLabel = this.getDefaultCentralLabel();
            if (!dataView.metadata || !dataView.metadata.objects) {
                return this.getDefaultCentralLabel();
            }
            objects = dataView.metadata.objects;
            centralLabelSettings.show = thisObj.settings.centralLabel.show;
            centralLabelSettings.color = thisObj.settings.centralLabel.color;
            centralLabelSettings.fontFamily = thisObj.settings.centralLabel.fontFamily;
            centralLabelSettings.fontSize = thisObj.settings.centralLabel.fontSize;
            centralLabelSettings.labelDisplayUnits = thisObj.settings.centralLabel.labeldisplayUnits;
            centralLabelSettings.labelPrecision = thisObj.settings.centralLabel.labelPrecision < 0 ?
                0 : (centralLabelSettings.labelPrecision) > 4 ? 4 : (centralLabelSettings.labelPrecision);
            centralLabelSettings.text = thisObj.settings.centralLabel.text;

            return centralLabelSettings;
        }
        // method to wrap the datalabels text
        private wrapPathText(padding?: number): (slice: any, index: number) => void {
            const self = this;

            return function(sliced: any, index: number) {
                if (!sliced.depth) {
                    return;
                }
                const selection: d3.Selection<any> = d3.select(this);
                const breadth = (d3.select(selection.attr("xlink:href")).node() as SVGPathElement).getTotalLength();
                self.wrapText(selection, padding, breadth);
            };
        }

        private wrapText(selection: d3.Selection<any>, padding?: number, widthText?: number): void {
            const node: SVGTextElement = selection.node() as SVGTextElement;
            let textLength: number = node.getComputedTextLength();
            let text: string = selection.text();
            widthText = widthText || 0;
            padding = padding || 0;
            while (textLength  > (widthText - twoLiteral * padding) && text.length > 0) {
                text = text.slice(0, -1);
                selection.text(text + textLiteral);
                textLength = node.getComputedTextLength();
            }
            if (textLength > (widthText - twoLiteral * padding)) {
                selection.text("");
            }
        }
        // method to get the Tooltip Data
        // tslint:disable-next-line:no-any
        private getTooltipData(value: any): VisualTooltipDataItem[] {
            let tooltipDataPointsFinal: VisualTooltipDataItem[];
            let primaryFormatter: string = ValueFormatter.DefaultNumericFormat;
            primaryFormatter = thisObj.dataViews.categorical.values[0].source.format ?
            thisObj.dataViews.categorical.values[0].source.format : ValueFormatter.DefaultNumericFormat;
            tooltipDataPointsFinal = [];
            const formatter: IValueFormatter = ValueFormatter.create({
                format: primaryFormatter
            });
            const dataTooltip: VisualTooltipDataItem = {
                displayName: "",
                value: ""
            };
            if (!value.depth) {
                dataTooltip.displayName = thisObj.settings.centralLabel.text;
            } else {
                dataTooltip.displayName = value.name === null || "" ? "(Blank)" : value.name;
            }
            dataTooltip.value = value.value;
            dataTooltip.value = formatter.format(dataTooltip.value);
            tooltipDataPointsFinal.push(dataTooltip);

            return tooltipDataPointsFinal;

        }
    }

    interface ISunBurstBehaviorOptions {
        behavior: IInteractiveBehavior;
        clearCatcher: any;
        arcSelection: any;
        legendSelection: any;
        interactivityService: IInteractivityService;
    }
    /**
     * SunburstBehaviour class contains variables for interactivity.
     */
    // tslint:disable-next-line:max-classes-per-file
    class SunburstBehavior implements IInteractiveBehavior {
        public legendClicked: string = "";
        public arcClicked: any = "";
        public clickVariable: number = 0;
        public selectionHandlerCopy: any;
        private options: ISunBurstBehaviorOptions;
        public bindEvents(options: ISunBurstBehaviorOptions, selectionHandler: ISelectionHandler): void {
            this.options = options;
            const clearCatcher: any = options.clearCatcher;
            const interactivityService: IInteractivityService = options.interactivityService;
            this.selectionHandlerCopy = selectionHandler;
            this.renderSelection(interactivityService.hasSelection());
        }
        public renderSelection(hasSelection: boolean): any {
            const a: number = 0;
        }
    }
}
