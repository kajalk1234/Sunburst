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
    import createLegend = powerbi.extensibility.utils.chart.legend.createLegend;
    import LegendData = powerbi.extensibility.utils.chart.legend.LegendData;
    import ILegend = powerbi.extensibility.utils.chart.legend.ILegend;
    import LegendPosition = powerbi.extensibility.utils.chart.legend.LegendPosition;
    import IColorPalette = powerbi.extensibility.IColorPalette;
    import TooltipEventArgs = powerbi.extensibility.utils.tooltip.TooltipEventArgs;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import IValueFormatter = powerbi.extensibility.utils.formatting.IValueFormatter;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;
    import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
    import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;

    let thisObj: any;
    let width: number;
    let height: number;
    let adjustedLegendHeight: number = 0;
    let legendWidth: number;
    let valuesArray: any = [];
    let selectionArray: any = [];
    let slice: any;
    let globalDepth: number = -1;
    let parentSum: any = [];
    let parentSelection: any = [];
    let parentIterator: number = 0;
    let groupColorArray: any = [];
    let globalVisibleArray: any = [];
    let lastLevelDataPoints: any[] = [];
    let legendData: LegendData;
    let iCount: number = 0;
    let legendDisplay: string = "";
    const rotateOpen: string = "rotate(";
    const translate: string = ")translate(";
    const rotateClose: string = ") rotate(";
    const closeLiteral: string = ")";
    const textLiteral: string = "\u2026";
    const dataLiteral: string = "__data__";
    const tenthLiteral: number = 10;
    const twoLiteral: number = 2;
    const fiveLiteral: number = 5;
    const fifteenLiteral: number = 15;
    const twentyLiteral: number = 20;
    const thirtyLiteral: number = 30;
    const hundredLiteral: number = 100;
    const oneEightyLiteral: number = 180;
    const ninetyLiteral: number = 90;
    const highOpacity: number = 1;
    const lowOpacity: number = 0.5;
    const errorMessagePadding: number = 3.5;
    const paddingFactor: number = 0.01;
    let categoriesLength: number = 0;
    let globalTreeChartDataPoints: any[] = [];
    let selectedSelectionId: ISelectionId[] = [];
    let pathSelectionArray: any = [];
    let centralTitleText: string = "";

    interface IChildren {
        name: string;
        value: number;
        depth: number;
        color: string;
        children: any;
    }

    /**
     * Interface for Detail Labels
     */
    export interface IDetailLabels {
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
     * @param {DataViewObjects} objects         - List of category objects.
     * @param {string} objectName               - Name of desired object.
     * @param {string} propertyName             - Name of desired property.
     * @param {T} defaultValue                  - Default value of desired property.
     */
    export function getCategoricalObjectValue<T>(objects: DataViewObjects,
        objectName: string, propertyName: string, defaultValue: T): T {
        if (objects) {
            const object: DataViewObject = objects[objectName];
            if (object) {
                const property: T = <T>object[propertyName];
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
        private static parseSettings(dataView: DataView): VisualSettings {
            return <VisualSettings>VisualSettings.parse(dataView);
        }

        public legendDataPoints: any;
        public data: any;
        public xScale: any;
        public yScale: any;
        public radius: any;
        public arcGenerate: any;
        public optionsUpdate: any;
        public gElement: any;
        public selectionArrayIndex: number;
        public measureDataLengthCount: number;
        private settings: VisualSettings;
        private mainDiv: any;
        private svg: any;
        private colors: IColorPalette;
        private visualHost: IVisualHost;
        private legend: ILegend;
        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private events: IVisualEventService;
        private dataViews: DataView;
        private interactivityService: IInteractivityService;
        private behavior: SunburstBehavior;
        private selectionManager: ISelectionManager;
        private arcsSelection: any;
        private legendPointSelection: any;

        constructor(options: VisualConstructorOptions) {
            this.visualHost = options.host;
            this.colors = options.host.colorPalette;
            this.optionsUpdate = options;
            this.tooltipServiceWrapper = createTooltipServiceWrapper(options.host.tooltipService, options.element);
            this.interactivityService = createInteractivityService(options.host);
            this.events = options.host.eventService;
            this.behavior = new SunburstBehavior();
            this.legend = createLegend(options.element, options.host && false, this.interactivityService, true);
            this.selectionManager = options.host.createSelectionManager();
            this.selectionManager.registerOnSelectCallback(
                () => {
                    this.syncSelectionState(this.arcsSelection, this.legendPointSelection,
                        <ISelectionId[]>this.selectionManager.getSelectionIds(), pathSelectionArray
                    );
                });
            this.mainDiv = d3.select(options.element)
                .append("div")
                .classed("MainDiv", true);
            d3.select(".clearCatcher").remove();
        }

        /**
         * Method that gets the opacity of children elements
         * @param {any} bands         - keeps the count of number of bands
         */
        public getColorBands(bands: any): any {
            const baseOpacity: number = 0.4;
            let fraction: any = 0;
            for (let index: number = bands; index >= 1; index--) {
                fraction = ((index * ((1 - baseOpacity) / bands)) + baseOpacity);
                if (fraction < 0.1) {
                    fraction = 0.1;
                }
                groupColorArray.push(fraction);
            }
            return groupColorArray;
        }

        /**
         * Method that checks the max value for radius
         */
        public checkRadius(): number {
            const radiusEntered: number = Number(this.settings.configuration.arcRadius);
            const calculatedRadius: number = (Math.min(width, height) / twoLiteral) - tenthLiteral;
            let returnValue: number = 0;
            if (radiusEntered < fiveLiteral || radiusEntered > calculatedRadius) {
                returnValue = Number(calculatedRadius.toFixed(twoLiteral));
            } else {
                returnValue = radiusEntered;
            }
            return returnValue;
        }

        /**
         * Method that creates hierarchies
         * @param {any} data        - data that is to be displayed      
         * @param {any} seq         - stores the sequence in which data is to be displayed
         */
        public createHieArr(data: any, seq: any): any {
            const hieObj: any = this.createHieobj(data, seq, 0);
            const hieArr: any = this.convertToHieArr(hieObj, "Top Level");
            return [{
                children: hieArr,
                name: "", parent: "null"
            }];
        }

        /**
         * Method that returns limit value
         * @param {number} a            - comparison number first 
         * @param {number} b            - comparison number second
         */
        public limitValue(a: number, b: number): number {
            return a <= b ? a : b;
        }

        /**
         * Method that returns lower limit value 
         * @param {number} a            - comparison number first 
         * @param {number} b            - comparison number second 
         */
        public lowerLimitValue(a: number, b: number): number {
            return a < b ? b : a;
        }

        /**
         * Method that sorts the array based on given key
         * @param {any} array            - The array to be sorted      
         * @param {any} key              - The key on which the array is to be sorted 
         */
        public sortByKey(array, key) {
            return array.sort((a, b) => {
                const x = a[key];
                const y = b[key];
                return ((x < y) ? 1 : ((x > y) ? -1 : 0));
            });
        }

        /**
         * Method that push data into Hierarchy Array
         * @param {any} eachObj         - signifies the object array 
         * @param {any} parent          - parent element
         */
        public convertToHieArr(eachObj: any, parent: any): any {
            const arr: any = [];
            for (const iterator of Object.keys(eachObj)) {
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

        /**
         * Method that gets the hierarchical structure data
         * @param {any} data            - data that is to be displayed
         * @param {any} seq             - stores the sequence in which data is to be displayed
         * @param {any} ind             - stores the index
         */
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
                    if (ind === categoriesLength) {
                        selectionArray.push(ele.identity);
                    }
                    childObj[ele[sequence]].push(ele);
                }
            }
            ind = ind + 1;
            let sum: number = 0;
            let selectionArrayNew: any = [];
            for (const ch of Object.keys(childObj)) {
                sum = 0;
                selectionArrayNew = [];
                for (const iterator of childObj[ch]) {
                    sum += iterator.values;
                    selectionArrayNew.push(iterator.identity);
                }
                parentSum.push(sum);
                parentSelection.push(selectionArrayNew);
            }
            for (const ch of Object.keys(childObj)) {
                childObj[ch] = this.sortByKey(childObj[ch], "values");
                childObj[ch] = this.createHieobj(childObj[ch], seq, ind);
            }
            return childObj;
        }

        /**
         * Method that sets the depth property of data
         * @param {any} data      - data that is to be displayed
         * @param {any} index     - Index of category object.
         */
        public depth(data: any, index: any): any {
            for (const iterator of data) {
                iterator.depth = index;
                if (iterator.children) {
                    this.depth(iterator.children, index + 1);
                }
            }
        }

        /**
         * Method that sets the value property of data
         * @param {any} data    - data that is to be displayed 
         */
        public value(data: any): any {
            // for last child  nodes
            for (const iterator of data) {
                if (iterator.children.length !== 0) {
                    this.value(iterator.children);
                } else {
                    iterator.value = valuesArray[iCount];
                    iterator.identity = selectionArray[iCount];
                    iCount++;
                }
            }
        }

        /**
         * Method that sets the parent value of data 
         * @param {any} data    - data that is to be displayed
         */
        public parentValue(data: any): any {
            for (const iterator of data) {
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

        /**
         * Method to get default data for children
         */
        public getDefaultData(): IChildren {
            return {
                children: [],
                color: "",
                depth: 0,
                name: "",
                value: 0,
            };
        }

        /**
         * Method to create legend Datapoints
         * @param {DataView} dataView           - the dataview object, which contains all data needed to render the visual.
         * @param {IVisualHost} host            - Contains references to the host which contains services
         */
        public createLegendData(dataView: DataView, host: IVisualHost): void {
            const colorPalette: IColorPalette = host.colorPalette;
            const groups: DataViewValueColumnGroup[] = this.dataViews.categorical.values.grouped();
            let textStr: any = "";
            let legendColor: string = "";
            groups.forEach((group: DataViewValueColumnGroup, iIterator: number = 0) => {
                textStr = group.name;
                const defaultColor: any = {
                    solid: {
                        color: colorPalette.getColor(textStr).value
                    }
                };
                legendColor = getCategoricalObjectValue<Fill>(group.objects, "colorSelector", "fill",
                    defaultColor).solid.color;
                legendData.dataPoints.push({
                    color: legendColor,
                    icon: powerbi.extensibility.utils.chart.legend.LegendIcon.Circle,
                    identity: host.createSelectionIdBuilder()
                        .withSeries(this.dataViews.categorical.values, group)
                        .createSelectionId(),
                    label: group.name === null || "" ? "(Blank)" : String(group.name),
                    selected: false
                });
            });
        }

        /**
         * Method to get parent data
         */
        public getParentData() {
            const dp: IChildren[] = [];
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

        /**
         * Method to create the data structure for the visual
         * @param {DataView} dataView           - the dataview object, which contains all data needed to render the visual. 
         * @param {IVisualHost} host            - Contains references to the host which contains services
         */
        public converter(dataView: DataView, host: IVisualHost): any {
            const dataViewLiteral: any = dataView.categorical.categories, columnnames: any = [];
            let groupDisplay: any = "Legend";
            for (const iterator of dataView.metadata.columns) {
                if (iterator.roles.parentcategory) {
                    groupDisplay = iterator.displayName;
                }
            }
            legendDisplay = groupDisplay;
            columnnames.push(groupDisplay);
            for (const jiterator of dataViewLiteral) {
                columnnames.push(jiterator.source.displayName);
            }
            const groups: DataViewValueColumnGroup[] = dataView.categorical.values.grouped(), dummyData: any = [];
            valuesArray = [];
            selectionArray = [];
            let groupName: any = "", categoriesDisplay: any = [];
            let categoriesValues: any = [], groupValues: any = [];
            groups.forEach((group: DataViewValueColumnGroup) => {
                groupName = group.name === null || "" ? "(Blank)" : group.name;
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
                        obj[groupDisplay] = groupName;
                        let name: any = "";
                        let value: any = 0;
                        for (const jIterator of dataViewLiteral) {
                            name = jIterator.source.displayName;
                            value = jIterator.values[iterator] === null
                                || "" ? "(Blank)" : jIterator.values[iterator];
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
            this.depth(treeData[0].children, 0);
            iCount = 0;
            this.value(treeData[0].children);
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
            let parentColor: string, parentSelectionID: any;
            groupColorArray = [];
            categoriesLength = dataViewLiteral.length;
            for (const iCounter of legendData.dataPoints) {
                for (const jCounter of treeData[0].children) {
                    parentColor = iCounter.color;
                    parentSelectionID = iCounter.identity;
                    if (iCounter.label === jCounter.name) {
                        jCounter.opacity = 1;
                        jCounter.color = parentColor;
                        jCounter.selectionId = parentSelectionID;
                        jCounter.legendClass = iCounter.label;
                        globalTreeChartDataPoints.push(jCounter);
                    }
                }
            }
            const categoriesLen: number = this.dataViews.categorical.categories.length + 1;
            // count for opacity
            this.getColorBands(categoriesLen);
            const count: number = 0;
            for (const iChild of treeData[0].children) {
                this.addColor(iChild.children, iChild.color, iChild.name, count);
                this.addSelectionId(iChild.children, iChild.selectionId);
            }
            this.interactivityService.applySelectionStateToData(globalTreeChartDataPoints);
            return treeData[0];
        }

        /**
         * Method to set the color property of data
         * @param data          - data that is to be displayed
         * @param color         - Color corresponding to data point.
         * @param label         - Adds color on labels
         * @param count
         */
        public addColor(data: any, color: any, label: any, count: number): any {
            count++;
            for (const iIterator of data) {
                globalTreeChartDataPoints.push(iIterator);
                iIterator.color = color;
                iIterator.legendClass = label;
                iIterator.opacity = groupColorArray[count];
                if (iIterator.children) {
                    this.addColor(iIterator.children, color, label, count);
                }
            }
        }

        /**
         * Method to set the selectionId property of data
         * @param data              - data that is to be displayed
         * @param selectionID       - adds selection id on each data point
         */
        public addSelectionId(data: any, selectionID: any): any {
            for (const iIterator of data) {
                globalTreeChartDataPoints.push(iIterator);
                iIterator.selectionId = selectionID;
                if (iIterator.children) {
                    this.addSelectionId(iIterator.children, selectionID);
                }
            }
        }

        /**
         * Method that sets Selection Id 
         * @param {any} dArray          - data array
         */
        public selectSelectionId(dArray: any) {
            if (dArray.children) {
                for (const iterator of dArray.children) {
                    this.selectSelectionId(iterator);
                }
            } else {
                for (const iterator of dArray.identity) {
                    selectedSelectionId.push(iterator);
                }
            }
        }

        /**
         * Method that returns distinct elements
         * @param {any} val             - value whose presence is being checked 
         * @param {any} i
         * @param {any} self 
         */
        public getDistinctElements(val: any, i: any, self: any): boolean {
            return self.indexOf(val) === i;
        }

        /**
         * Method that updates legend position
         * @param options                      - Contains references to the size of the container and the dataView which contains all the data the visual had queried.      
         * @param legendHeight                 - variable that stores the legend height
         * @param mainDivLiteral               - variable to set style and attributes to main div
         */
        public legendPositionUpdate(options, legendHeight, mainDivLiteral): VisualUpdateOptions {
            switch (this.settings.legend.position) {
                case "Top":
                    height = options.viewport.height - legendHeight.height;
                    width = options.viewport.width;
                    adjustedLegendHeight = legendHeight.height;
                    mainDivLiteral.style({ "margin-left": 0, "margin-right": 0, "margin-top": `${legendHeight.height}px`, });
                    this.legend.changeOrientation(LegendPosition.Top);
                    break;
                case "Top center":
                    height = options.viewport.height - legendHeight.height;
                    legendWidth = legendHeight.width + thirtyLiteral;
                    width = options.viewport.width;
                    adjustedLegendHeight = legendHeight.height;
                    mainDivLiteral.style({ "margin-left": 0, "margin-right": 0, "margin-top": `${legendHeight.height}px`, });
                    this.legend.changeOrientation(LegendPosition.TopCenter);
                    if (d3.select(".navArrow")[0][0] !== null) {
                        const xpos: string = d3.select(".navArrow").attr("transform").substring(tenthLiteral,
                            d3.select(".navArrow").attr("transform").indexOf(","));
                        if (Number(xpos) > width - tenthLiteral) {
                            this.legend.changeOrientation(0);
                            this.legend.drawLegend(legendData, options.viewport);
                        }
                    }
                    break;
                case "Bottom":
                    height = options.viewport.height - legendHeight.height;
                    width = options.viewport.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({ "margin-left": 0, "margin-right": 0, "margin-top": 0, });
                    this.legend.changeOrientation(LegendPosition.Bottom);
                    break;
                case "Bottom center":
                    height = options.viewport.height - legendHeight.height;
                    legendWidth = legendHeight.width + thirtyLiteral;
                    width = options.viewport.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({ "margin-left": 0, "margin-right": 0, "margin-top": 0, });
                    this.legend.changeOrientation(LegendPosition.BottomCenter);
                    if (d3.select(".navArrow")[0][0] !== null) {
                        const xpos: string = d3.select(".navArrow").attr("transform").substring(tenthLiteral,
                            d3.select(".navArrow").attr("transform").indexOf(","));
                        if (Number(xpos) > width - tenthLiteral) {
                            this.legend.changeOrientation(1);
                            this.legend.drawLegend(legendData, options.viewport);
                        }
                    }
                    break;
                case "Left":
                    height = options.viewport.height;
                    width = options.viewport.width - legendHeight.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({ "margin-left": `${legendHeight.width}px`, "margin-right": 0, "margin-top": 0, });
                    this.legend.changeOrientation(LegendPosition.Left);
                    break;
                case "Left center":
                    height = options.viewport.height;
                    width = options.viewport.width - legendHeight.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({ "margin-left": `${legendHeight.width}px`, "margin-right": 0, "margin-top": 0, });
                    this.legend.changeOrientation(LegendPosition.LeftCenter);
                    break;
                case "Right":
                    height = options.viewport.height;
                    width = options.viewport.width - legendHeight.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({ "margin-left": 0, "margin-right": `${legendHeight.width}px`, "margin-top": 0, });
                    this.legend.changeOrientation(LegendPosition.Right);
                    break;
                case "Right center":
                    height = options.viewport.height;
                    width = options.viewport.width - legendHeight.width;
                    adjustedLegendHeight = 0;
                    mainDivLiteral.style({ "margin-left": 0, "margin-right": `${legendHeight.width}px`, "margin-top": 0, });
                    this.legend.changeOrientation(LegendPosition.RightCenter);
                    break;
                default:
                    break;
            }
            return options;
        }

        /**
         * Method to get the position of legend
         * @param {VisualUpdateOptions} options          - Contains references to the size of the container and the dataView which contains all the data the visual had queried.
         */
        public legendPosition(options: VisualUpdateOptions): void {
            const legendHeight: IViewport = this.legend.getMargins(), mainDivLiteral: any = d3.selectAll(".MainDiv");
            options = this.legendPositionUpdate(options, legendHeight, mainDivLiteral);
            $(".legend #legendGroup").on("click.load", ".navArrow", (): any => {
                d3.selectAll(".main-arc").style("opacity", () => {
                    return 1;
                });
                this.selectionManager.clear();
                thisObj.legendClicked();
            });
        }

        /**
         * Method that specifies what to do when legend is clicked
         */
        public legendClicked(): void {
            const selectionManager: ISelectionManager = this.selectionManager;
            const legendelements: any = d3.selectAll(".legendItem")[0];
            d3.selectAll(".legendItem").on("click", function (d: any): void {
                for (const iterator of legendelements) {
                    iterator[dataLiteral].selected = false;
                }
                d.selected = true;
                const elements: any = d3.selectAll(".main-arc")[0];
                thisObj.markLegendPointsAsSelectedOnArc(d, elements);
                if (!thisObj.settings.animation.show) {
                    selectionManager.clear();
                    if (d3.select(this).classed("selectedlegend")) {
                        d3.selectAll(".legendItem").style("opacity", () => {
                            return 1;
                        });
                        d3.selectAll(".main-arc").style("opacity", () => {
                            return 1;
                        });
                        d3.select(this).classed("selectedlegend", false);
                    } else {
                        selectionManager.select(d.identity).then(() => {
                            d3.selectAll(".legendItem").classed("selectedlegend", false);
                            d3.select(this).classed("selectedlegend", true);
                            d3.selectAll(".main-arc").style("opacity", (arcpt: SelectableDataPoint) => {
                                return (!arcpt.selected) ? lowOpacity : highOpacity;
                            });
                            d3.selectAll(".legendItem").style("opacity", (legendpt: SelectableDataPoint) => {
                                return (!legendpt.selected) ? lowOpacity : highOpacity;
                            });
                        });
                    }
                }
                (<Event>d3.event).stopPropagation();
            });
        }

        /**
         * Method to warn the user not to insert same fields in category and subcategory fields
         * @param options                   - Contains references to the size of the container and the dataView which contains all the data the visual had queried.
         * @param svgLiteral                - variable to set style and attributes to svg
         * @param titleLiteral              - variable to set style and attributes to title
         * @param legenditems               - list of categories in legend
         * @param barmsgLiteral             - variable to set style and attributes to bar message
         */
        public dataViewsCategoriesWarningMethod(options, svgLiteral, titleLiteral, legendItems, barmsgLiteral): VisualUpdateOptions {
            for (const iterator of this.dataViews.categorical.categories) {
                if (iterator.source.roles.parentcategory) {
                    height = options.viewport.height;
                    width = options.viewport.width;
                    svgLiteral.remove();
                    titleLiteral.remove();
                    legendItems.remove();
                    barmsgLiteral.style({
                        "margin-left": `${width / errorMessagePadding}px`,
                        "margin-top": `${height / twoLiteral}px`
                    }).append("text").classed("barMessageText", true)
                        .text("Same values field cannot be inserted in Category and Subcategory fields");
                    return;
                }
            }
            return options;
        }

        /**
         * Method to update the Data views
         * @param options                   - Contains references to the size of the container and the dataView which contains all the data the visual had queried.
         * @param svgLiteral                - variable to set style and attributes to svg
         * @param titleLiteral              - variable to set style and attributes to title
         * @param legenditems               - list of categories in legend
         * @param barmsgLiteral             - variable to set style and attributes to bar message
         */
        public dataViewsUpdate(options, svgLiteral, titleLiteral, legenditems, barmsgLiteral): VisualUpdateOptions {
            if (this.dataViews === undefined || this.dataViews.categorical === undefined || this.dataViews.categorical.categories === undefined) {
                height = options.viewport.height; 
                width = options.viewport.width; 
                svgLiteral.remove(); 
                titleLiteral.remove(); 
                legenditems.remove();
                if (this.dataViews.categorical.values !== undefined && this.dataViews.categorical.values.source.roles.category) {
                    barmsgLiteral.style({
                        "margin-left": `${width / errorMessagePadding}px`,
                        "margin-top": `${height / twoLiteral}px`
                    }).append("text").classed("barMessageText", true)
                        .text("Same values field cannot be inserted in Category and Subcategory fields");
                    return;
                }
                if (this.dataViews.categorical.categories === undefined) {
                    barmsgLiteral.style({
                        "margin-left": `${width / errorMessagePadding}px`,
                        "margin-top": `${height / twoLiteral}px`
                    }).append("text").classed("barMessageText", true)
                        .text("Insert Values in Mandatory SubCategory Field");
                    return;
                }
            }
            if (this.dataViews.categorical.values === undefined || this.dataViews.categorical.values.grouped === undefined) {
                height = options.viewport.height;
                width = options.viewport.width; 
                svgLiteral.remove();
                titleLiteral.remove();
                legenditems.remove();
                barmsgLiteral.style({
                    "margin-left": `${width / errorMessagePadding}px`,
                    "margin-top": `${height / twoLiteral}px`
                }).append("text").classed("barMessageText", true)
                    .text("Insert Values in Mandatory Measure Field");
                return;
            }
            return options;
        }

        /**
         * Method to get the data and render the visual
         * @param options                   - Contains references to the size of the container and the dataView which contains all the data the visual had queried.
         * @param titleLiteral              - variable to set style and attributes to title
         * @param legenditems               - list of categories in legend
         */
        public updateHelperFunctionThree(options, titleLiteral, legenditems): VisualUpdateOptions {
            if (this.settings.legend.show) {
                this.legendPosition(options);
                this.legend.drawLegend(legendData, options.viewport);
                this.legendPosition(options); 
                this.legendClicked();
            }
            else {
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
            return options;
        }

        /**
         * Method to update the path elements
         * @param newSlice
         * @param arcGenerator          - generates arc in the visual 
         * @param startAngle 
         * @param endAngle 
         * @param x 
         * @param angle 
         * @param y 
         */
        public pathElementsUpdate(newSlice, arcGenerator, startAngle, endAngle, x, angle, y) {
            return newSlice.append("path").attr("id", (d: any, index: number) => {
                return `path-${index}`;
            }).attr("class", (d: any, index: number) => {
                // for tooltip central labels
                if (index === 0) {
                    return "main-arc";
                } else {
                    return `${"main-arc"} ${"arc-path"}`;
                }
            }).attr("d", arcGenerator).style("fill", (d: any) => {
                startAngle = Math.max(0, Math.min(twoLiteral * Math.PI, x(d[`x`])));
                endAngle = Math.max(0, Math.min(twoLiteral * Math.PI, x(d[`x`] + d[`dx`])));
                angle = endAngle - startAngle;
                d.width = ((Math.PI * angle) / oneEightyLiteral) * Math.max(0, (y(d.y) + y(d.dy)));
                if (!d.depth) {
                    return thisObj.settings.configuration.fill;
                }
                else {
                    return d.color;
                }
            }).style("fill-opacity", (d) => d.opacity).style("stroke", this.settings.configuration.strokeColor);
        }

        /**
         * Method to show Data labels
         * @param newSlice 
         * @param y 
         */
        public showDataLabels(newSlice, y) {
            if (this.settings.dataLabels.show) {
                let heightDataLabel: number = 0, demo: number = 0, textPropertiesDestSourceName: TextProperties;
                const textEnter = newSlice.append("text").attr("id", (d: any, index: number) => {
                    return `text-${index}`;
                }).attr("class", "datalabels")
                    .attr("dy", (d) => {
                        return (Math.max(0, y(d[`y`] + d[`dy`])) - Math.max(0, y(d[`y`]))) / twoLiteral;
                    }).attr("background-color", thisObj.settings.dataLabels.backgroundColor).style({
                        "background-color": this.settings.dataLabels.backgroundColor, "fill": this.settings.dataLabels.color, "fill-opacity": 1,
                        "font-family": this.settings.dataLabels.fontFamily, "font-size": `${this.settings.dataLabels.fontSize}px`,
                    });
                textEnter.append("textPath").attr("id", (d: any, index: number) => {
                    return `textPath-${index}`;
                }).attr("startOffset", "50%").attr("xlink:href", (d, i) => `#path-hidden-${i}`)
                    .text((d, i) => {
                        demo = Math.max(0, y(d[`y`] + d[`dy`])) - Math.max(0, y(d[`y`]));
                        textPropertiesDestSourceName = {
                            fontFamily: thisObj.settings.dataLabels.fontFamily,
                            fontSize: `${thisObj.settings.dataLabels.fontSize}px`,
                            text: d.name
                        };
                        if (d.depth === 1) {
                            heightDataLabel = textMeasurementService.measureSvgTextHeight(textPropertiesDestSourceName);
                        }
                        // to check the height of data labels
                        if (heightDataLabel + fiveLiteral < demo) {
                            return d.name;
                        }
                        else {
                            return "";
                        }
                    }).each(this.wrapPathText(fifteenLiteral));
                d3.select("#text3").style("background-color", this.settings.dataLabels.backgroundColor);
                d3.select("#text3").attr("fill", thisObj.settings.dataLabels.backgroundColor);
            }
        }

        /**
         * Helper method to add detail labels on the visual
         * @param pathElements 
         */
        public addDetailsLabelsHelper(pathElements) {
            if (this.settings.detailLabels.show) {
                lastLevelDataPoints = [];
                pathElements.each((d: any, i: number) => {
                    if (d.depth === (categoriesLength + 1)) {
                        lastLevelDataPoints.push(d);
                    }
                });
                this.addDetailLabels(lastLevelDataPoints, this.radius);
            }
        }

        /**
         * Helper function for on click events
         * @param selectionManager      - variable to handle on click events on arcs
         */
        public onClickHelperFunction(selectionManager: ISelectionManager) {
            d3.selectAll(".main-arc").on("click", (d: any): void => {
                const elements: any = d3.selectAll(".main-arc")[0];
                for (const iterator of elements) {
                    iterator[dataLiteral].selected = false;
                }
                d.selected = true;
                if (thisObj.settings.animation.show) {
                    (<Event>d3.event).stopPropagation();
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
                    thisObj.markDataPointsAsSelectedOnArc(d, elements); selectionManager.clear();
                    if (d3.select(event.currentTarget).classed("selectedarc")) {
                        d3.selectAll(".main-arc").style("opacity", (arcpt: SelectableDataPoint) => {
                            return 1;
                        });
                        d3.selectAll(".legendItem").style("opacity", (legendpt: SelectableDataPoint) => {
                            return 1;
                        });
                        d3.select(event.currentTarget).classed("selectedarc", false);
                    } else {
                        selectedSelectionId = []; thisObj.selectSelectionId(d);
                        selectionManager.select(selectedSelectionId).then((ids: ISelectionId[]) => {
                            d3.selectAll(".main-arc").classed("selectedarc", false);
                            d3.select(event.currentTarget).classed("selectedarc", true);
                            d3.selectAll(".main-arc").style("opacity", (arcPoint: SelectableDataPoint) => {
                                return (!arcPoint.selected) ? lowOpacity : highOpacity;
                            });
                            d3.selectAll(".legendItem").style("opacity", (legendpt: SelectableDataPoint) => {
                                const legendSelectionId: any = legendpt.identity;
                                if (legendSelectionId.includes(d.selectionId)) {
                                    return highOpacity;
                                }
                                else {
                                    return lowOpacity;
                                }
                            });
                        });
                    }
                }
                (<Event>d3.event).stopPropagation();
            });
        }

        /**
         * Method to update newSlice
         * @param newSlice 
         * @param degree 
         * @param multiline                 - split lengthy lines into the next line
         * @param angle
         * @param x 
         * @param y 
         * @param rotate 
         * @param totalHeight 
         * @param textStrings 
         * @param primaryFormat 
         * @param primaryFormatter 
         * @param primaryFormatterVal 
         * @param alternateFormatter 
         * @param options                    - Contains references to the size of the container and the dataView which contains all the data the visual had queried.
         * @param textPropertiesDestSource   
         * @param centerElement 
         * @param textHeight 
         */
        public newSliceUpdate(newSlice, degree, multiline, angle, x, y, rotate, totalHeight, textStrings, primaryFormat, primaryFormatter, primaryFormatterVal,
            alternateFormatter, options, textPropertiesDestSource, centerElement, textHeight) {
            newSlice.append("text")
                .attr("id", (index: number) => {
                    return `text-${index}`;
                })
                .style("fill-opacity", 1)
                .style("fill", this.settings.centralLabel.color)
                .attr("class", "lowerCentralText")
                .attr("transform", (d) => {
                    if (!d.depth) {
                        degree = -ninetyLiteral;
                    } else {
                        degree = ninetyLiteral;
                    }
                    multiline = (d.name || "").split(" ").length > 1;
                    angle = x(d.x + d.dx / twoLiteral) * oneEightyLiteral / Math.PI - ninetyLiteral;
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
                            if (this.dataViews && this.dataViews.categorical
                                && this.dataViews.categorical.values
                                && this.dataViews.categorical.values[0]) {
                                primaryFormat = this.dataViews.categorical.values[0].source.format ?
                                    this.dataViews.categorical.values[0].source.format
                                    : valueFormatter.DefaultNumericFormat;
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
                        titleFormatter = valueFormatter.create({
                            format: options.dataViews[0].categorical.values[0].source.format ?
                                options.dataViews[0].categorical.values[0].source.format
                                : valueFormatter.DefaultNumericFormat,
                        });
                        centralTitleText = centralTitleText + " " + titleFormatter.format(d.value);
                        primaryFormatter = valueFormatter.create({
                            format: options.dataViews[0].categorical.values[0].source.format ?
                                options.dataViews[0].categorical.values[0].source.format
                                : valueFormatter.DefaultNumericFormat,
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
                        centerElement = d3.selectAll("#path-0").node();
                        textHeight = textMeasurementService.measureSvgTextHeight(textPropertiesDestSource);
                        // because starting from 'y' to height
                        if ((textHeight * twoLiteral) + fiveLiteral < centerElement.getBBox().height) {
                            return textMeasurementService.getTailoredTextOrDefault(
                                textPropertiesDestSource, d.width * tenthLiteral);
                        } else {
                            return "";
                        }
                    }
                });
        }

        /**
         * Method to show central labels
         * @param newSlice 
         * @param angle 
         * @param x 
         * @param y 
         * @param options                - Contains references to the size of the container and the dataView which contains all the data the visual had queried.
         */
        public centralLabelsShow(newSlice, angle, x, y, options) {
            if (thisObj.settings.centralLabel.show) {
                let totalHeight: number = 0, degree: number;
                let textPropertiesDestSource: TextProperties, textStrings: string = "";
                let primaryFormatterVal: number = 0, primaryFormat: string = valueFormatter.DefaultNumericFormat;
                let alternateFormatter: number = 0, multiline: any;
                let rotate: any, primaryFormatter: IValueFormatter;
                let centerElement: any, textHeight: number = 0;
                centralTitleText = "";
                const textEnt = newSlice.append("text")
                    .style("fill-opacity", 1)
                    .style("fill", this.settings.centralLabel.color)
                    .attr("class", "upperCentralText")
                    .attr("transform", (d) => {
                        if (!d.depth) {
                            degree = -ninetyLiteral;
                        } else {
                            degree = ninetyLiteral;
                        }
                        multiline = (d.name || "").split(" ").length > 1;
                        angle = x(d.x + d.dx / twoLiteral) * oneEightyLiteral / Math.PI - ninetyLiteral;
                        rotate = angle + (multiline ? -.5 : 0);
                        return rotateOpen + rotate + translate + (y(d.y) + thirtyLiteral) + rotateClose + degree + closeLiteral;
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
                            totalHeight = -thirtyLiteral + textMeasurementService.measureSvgTextHeight(textPropertiesDestSource);
                            return textMeasurementService.getTailoredTextOrDefault(
                                textPropertiesDestSource, d.width * tenthLiteral);
                        }
                    });
                this.newSliceUpdate(newSlice, degree, multiline, angle, x, y, rotate, totalHeight, textStrings, primaryFormat, primaryFormatter, primaryFormatterVal,
                    alternateFormatter, options, textPropertiesDestSource, centerElement, textHeight);
                // append title to central element
                newSlice.append("title")
                    .text((d) => {
                        if (!d.depth) {
                            return centralTitleText;
                        }
                    })
                    .classed("centralTitle", true);
                d3.select("#text-0")
                    .attr("y", "-25");
                d3.select("#path-0")
                    .style("fill", this.settings.configuration.fill);
                d3.select("#text3").attr("fill", thisObj.settings.dataLabels.backgroundcolor);
            }
            return options;
        }

        /**
         * Method to get the data and render the visual
         * @param newSlice 
         * @param x 
         * @param y 
         * @param angle
         * @param options                    - Contains references to the size of the container and the dataView which contains all the data the visual had queried.
         * @param selectionManager           - variable to handle on click events on arcs
         * @param pathElements 
         */
        public updateHelperFunctionFour(newSlice, x, y, angle, options, selectionManager, pathElements) {
            this.arcsSelection = d3.selectAll("path.main-arc");
            this.legendPointSelection = d3.selectAll(".legendItem");
            if (!this.settings.animation.show) {
                d3.select("#path-0").style("cursor", "default");
            }
            this.showDataLabels(newSlice, y);
            options = this.centralLabelsShow(newSlice, angle, x, y, options);
            if (this.settings.centralLabel.show) {
                this.getCentralLabel(this.dataViews);
            }
            this.addDetailsLabelsHelper(pathElements);
            this.onClickHelperFunction(selectionManager);
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
                (<Event>d3.event).stopPropagation();
            });
            this.addLegendSelection(globalTreeChartDataPoints);
            this.tooltipServiceWrapper.addTooltip(d3.selectAll("path.arc-path"),
                (tooltipEvent: TooltipEventArgs<any>) =>
                    this.getTooltipData(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<any>) =>
                    tooltipEvent.data.selectionId);
            this.syncSelectionState(
                this.arcsSelection, this.legendPointSelection,
                <ISelectionId[]>this.selectionManager.getSelectionIds(), pathSelectionArray
            );
            return options;
        }

        /**
         * Method to get the data and render the visual
         * @param {VisualUpdateOptions} options            - Contains references to the size of the container and the dataView which contains all the data the visual had queried.
         */

        public update(options: VisualUpdateOptions): void {
            try {
                this.events.renderingStarted(options);
                thisObj = this;
                this.handleLandingPage(options);
                if (!options.dataViews.length) {
                    return;
                }
                d3.select(".barmsg").selectAll("*").remove();
                globalTreeChartDataPoints = [];
                this.settings = Sunburst.parseSettings(options && options.dataViews && options.dataViews[0]);
                this.dataViews = options.dataViews[0];
                d3.select("#MainSvg").remove();
                this.svg = this.mainDiv.append("svg").attr("id", "MainSvg").style("cursor", "context-menu");
                const svgLiteral: any = d3.select("#MainSvg");
                const titleLiteral: any = d3.selectAll(".legendTitle");
                const legendItems: any = d3.selectAll(".legendItem");
                const barmsgLiteral: any = d3.select(".barmsg");
                this.svg.on("contextmenu", () => {
                    const mouseEvent: MouseEvent = <MouseEvent>d3.event;
                    const eventTarget: EventTarget = mouseEvent.target;
                    const dataPoint: any = d3.select(eventTarget).datum();
                    if (dataPoint !== undefined) {
                        this.selectionManager.showContextMenu(dataPoint ? dataPoint.selectionId : {}, {
                            x: mouseEvent.clientX,
                            y: mouseEvent.clientY
                        });
                        mouseEvent.preventDefault();
                    }
                });
                options = this.dataViewsUpdate(options, svgLiteral, titleLiteral, legendItems, barmsgLiteral);
                // for same field in Category and Subcategory Field
                options = this.dataViewsCategoriesWarningMethod(options, svgLiteral, titleLiteral, legendItems, barmsgLiteral);
                this.data = this.converter(this.dataViews, this.visualHost);
                d3.select(".legend").style({ visiblity: "visible" });
                options = this.updateHelperFunctionThree(options, titleLiteral, legendItems);
                categoriesLength = this.dataViews.categorical.categories.length;
                const cornerRadiusValue: number = this.limitValue(this.lowerLimitValue
                    (this.settings.configuration.cornerRadius, 0), tenthLiteral);
                const arcpaddingValue: number = this.limitValue(this.lowerLimitValue
                    (this.settings.configuration.padding, 0),
                    tenthLiteral) * paddingFactor;
                this.radius = this.checkRadius();
                // reduce the radius when detail labels are on
                if (this.settings.detailLabels.show) {
                    this.radius = this.radius - this.settings.detailLabels.fontSize;
                }
                const x: any = this.xScale = d3.scale.linear()
                    .range([0, twoLiteral * Math.PI])
                    .clamp(true);
                const y: any = this.yScale = d3.scale.pow()
                    .range([0, this.radius]);
                const partitionLayout: any = d3.layout.partition().value((d) => d.value);
                const arcGenerator: any = this.arcGenerate = d3.svg.arc()
                    .startAngle((d) => Math.max(0, Math.min(twoLiteral * Math.PI, x(d[`x`]))))
                    .endAngle((d) => Math.max(0, Math.min(twoLiteral * Math.PI, x(d[`x`] + d[`dx`]))))
                    .innerRadius((d) => Math.max(0, y(d[`y`])))
                    .outerRadius((d) => Math.max(0, y(d[`y`] + d[`dy`])))
                    .cornerRadius(cornerRadiusValue)
                    .padAngle(arcpaddingValue);
                const rootNode = this.data;
                this.svg.style({
                    height: `${height}px`, width: `${width}px`
                }).attr("viewBox", `${-width / twoLiteral} ${-height / twoLiteral} ${width} ${height}`);
                slice = this.svg.selectAll("g.slice")
                    .data(partitionLayout.nodes(rootNode));
                slice.exit().remove();
                const newSlice = this.gElement = slice.enter()
                    .append("g").attr("class", "slice");
                const selectionManager: ISelectionManager = this.selectionManager;
                let startAngle = 0, endAngle = 0, angle = 0;
                const pathElements: any = this.pathElementsUpdate(newSlice, arcGenerator, startAngle, endAngle, x, angle, y);
                // to store the ids for bookmarks
                pathSelectionArray = [];
                for (const iterator of pathElements[0]) {
                    pathSelectionArray.push({
                        path: iterator,
                        selection: iterator[dataLiteral].identity
                    });
                }
                const pathElementsHidden: any = newSlice.append("path")
                    .attr("id", (d: any, index: number) => {
                        return `path-hidden-${index}`;
                    }).attr("class", "main-arc-hidden")
                    .attr("d", (d: any, index: number) => {
                        return d3.select(`#path-${index}`).attr("d").split("L")[0];
                    })
                    .attr("fill", "none");
                options = this.updateHelperFunctionFour(newSlice, x, y, angle, options, selectionManager, pathElements);
                this.events.renderingFinished(options);
            } catch (exception) {
                this.events.renderingFailed(options, exception);
            }
        }

        /**
         * Method to add Legend Selection
         * @param dataPoints            - data points that are to be displayed
         */
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

        /**
         * Method to tween the arcs and datalabels on animation
         * @param d
         */
        public focusOn(d) {
            // Reset to top-level if no data point specified
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
                    const yr = d3.interpolate(thisObj.yScale.range(), [d.y ? twentyLiteral : 0, thisObj.radius]);

                    return (t) => { thisObj.xScale.domain(xd(t)); thisObj.yScale.domain(yd(t)).range(yr(t)); };
                });
            transition.selectAll("path.main-arc")
                .attrTween("d", (d) => () => thisObj.arcGenerate(d));
            transition.selectAll(".main-arc-hidden")
                .attrTween("d", (d) => () => {
                    return thisObj.arcGenerate(d).split("L")[0];
                });
            d3.select("#text-0")
                .attr("y", -fifteenLiteral);
            globalVisibleArray = [];
            // store childrens and parent in array
            thisObj.visibleArrayChildren(d);
            thisObj.visibleArrayParent(d);
            thisObj.gElement.selectAll("path").style("visibility", (e) => {
                if (d === e) { return true; }
                if (globalVisibleArray.includes(e)) {
                    return "visible";
                }
                return "hidden";
            });
        }

        /**
         * Method to tween the detail labels on animation
         * @param d 
         */
        public focusDetailOn(d) {
            if (d.children) {
                for (const iterator of d.children) {
                    this.focusDetailOn(iterator);
                }
            } else {
                lastLevelDataPoints.push(d);

            }
        }

        /**
         * Method to check if p is parent of c
         * @param p             - parent element
         * @param c             - child element
         */
        public isParentOf(p, c) {
            if (p === c) { 
                return true; 
            }
            if (p.children) {
                for (const iterator of p.children) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Method to check if c is parent
         * @param p             - parent element
         * @param c             - child element
         */
        public isParent(p, c) {
            if (p === c) { 
                return true; 
            }
            if (p.parent === c) { 
                return true; 
            }
            if (p.children) {
                for (const iterator of p.children) {
                    this.isParent(iterator, c);
                }
            }
            return false;
        }

        /**
         * Method to calculate mid angle
         * @param d 
         */
        public midAngle(d: any): any {
            return d.startAngle + ((d.endAngle - d.startAngle)) / 2;
        }

        /**
         * Helper function to add Detail Labels
         * @param detailLabelProp               - detail label properties for the data
         * @param text                          - text to be displayed
         * @param formatter                     - formatter variable to format the text
         * @param d
         * @param val                           - value to be displayed 
         * @param summaryValue                  - summary value in centre of visual
         * @param val1                          - formatted value
         * @param cat                           - category name
         */
        public addDetailLabelsHelperFunctionOne(
            detailLabelProp: IDetailLabels,
            text: string,
            formatter: IValueFormatter,
            d: any,
            val: string,
            summaryValue: number,
            val1: string,
            cat: string): string {
            if (detailLabelProp.labelStyle === "Data") {
                text = formatter.format((d.value));
            }
            else if (detailLabelProp.labelStyle === "Category") {
                text = d.data.name;
            }
            else if (detailLabelProp.labelStyle === "Percent of total") {
                val = (d.data.value / summaryValue * hundredLiteral).toFixed(detailLabelProp.labelPrecision).toString();
                text = `${val}%`;
            }
            else if (detailLabelProp.labelStyle === "Category, percent of total") {
                val = d.data.name;
                text = d.data.name;
            }
            else if (detailLabelProp.labelStyle === "Data value, percent of total") {
                val1 = formatter.format(d.data.value);
                text = `${val1}`;
            }
            else if (detailLabelProp.labelStyle === "Both") {
                text = `${d.data.name}`;
            }
            else {
                cat = d.data.name;
                text = `${cat}`;
            }
            return text;
        }

        /**
         * Helper function to add Detail Labels
         * @param detailLabelProp               - detail label properties for the data
         * @param alternateFormatter
         * @param d 
         * @param primaryFormatterVal           - primary formatter variable
         */
        public addDetailLabelsHelperFunctionTwo(
            detailLabelProp: IDetailLabels,
            alternateFormatter: number,
            d: any,
            primaryFormatterVal: number): number {
            if (!detailLabelProp.labelDisplayUnits) {
                alternateFormatter = parseInt(d.data.value, tenthLiteral).toString().length;
                if (alternateFormatter > 9) {
                    primaryFormatterVal = 1e9;
                }
                else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                    primaryFormatterVal = 1e6;
                }
                else if (alternateFormatter <= 6 && alternateFormatter >= 4) {
                    primaryFormatterVal = 1e3;
                }
                else {
                    primaryFormatterVal = 10;
                }
            }
            return primaryFormatterVal;
        }

        /**
         * Helper function to add Detail Labels
         * @param detailLabelProp                   - detail label properties for the data
         * @param text                              - text to be displayed
         * @param formatter                         - formatter variable to format the text
         * @param d 
         * @param val                               - value to be displayed 
         * @param summaryValue                      - summary value in centre of visual
         * @param val1                              - formatted value
         * @param val2                              - formatted value
         * @param cat                               - category name
         * @param percentVal                        - percentage value to be displayed
         */
        public addDetailLabelsHelperFunctionThree(
            detailLabelProp: IDetailLabels,
            text: string,
            formatter: IValueFormatter,
            d: any,
            val: string,
            summaryValue: number,
            val1: string,
            val2: string,
            cat: string,
            percentVal: string): string {
            if (detailLabelProp.labelStyle === "Data") {
                text = formatter.format((d.value));
            }
            else if (detailLabelProp.labelStyle === "Category") {
                text = d.data.name;
            }
            else if (detailLabelProp.labelStyle === "Percent of total") {
                val = (d.data.value / summaryValue * hundredLiteral).toFixed(detailLabelProp.labelPrecision).toString();
                text = `${val}%`;
            }
            else if (detailLabelProp.labelStyle === "Category, percent of total") {
                val = (d.data.value / summaryValue * hundredLiteral).toFixed(twoLiteral).toString();
                text = `${d.data.name} ${val}%`;
            }
            else if (detailLabelProp.labelStyle === "Data value, percent of total") {
                val1 = formatter.format(d.data.value);
                val2 = (d.data.value / summaryValue * hundredLiteral).toFixed(twoLiteral).toString();
                text = `${val1} (${val2}%)`;
            }
            else if (detailLabelProp.labelStyle === "Both") {
                val = formatter.format(d.data.value);
                text = `${d.data.name} ${val}`;
            }
            else {
                cat = d.data.name;
                val = formatter.format(d.data.value);
                percentVal = (d.data.value / summaryValue * hundredLiteral).toFixed(twoLiteral).toString();
                text = `${cat} ${val} (${percentVal}%)`;
            }
            return text;
        }

        /**
         * Method to get the final text
         * @param primaryFormatter                  - primary formatter variable
         * @param detailLabelProp                   - detail label properties for the data
         * @param alternateFormatter 
         * @param primaryFormatterVal               - primary formatted value
         * @param formatter                         - formatter variable to format the text
         * @param summaryValue                      - summary value in centre of visual
         * @param percentVal                        - percentage value to be displayed
         * @param d 
         * @param text                              - text to be displayed
         * @param textProperties                    - contains properties for displaying the text
         * @param widthOfText                       - contains width of the text
         * @param pos                               - determines position of the text
         * @param outerArc 
         * @param position 
         * @param textEnd 
         * @param finalText                         - final formatted text
         */
        public getFinalText(primaryFormatter, detailLabelProp, alternateFormatter, primaryFormatterVal, formatter, summaryValue, percentVal, d, text, textProperties,
            widthOfText, pos, outerArc, position, textEnd, finalText) {
            if (thisObj.dataViews && thisObj.dataViews.categorical && thisObj.dataViews.categorical.values && thisObj.dataViews.categorical.values[0]) {
                primaryFormatter = thisObj.dataViews.categorical.values[0].source.format ? thisObj.dataViews.categorical.values[0].source.format
                    : valueFormatter.DefaultNumericFormat;
            }
            if (!detailLabelProp.labelDisplayUnits) {
                if (alternateFormatter > 9) {
                    primaryFormatterVal = 1e9;
                }
                else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                    primaryFormatterVal = 1e6;
                }
                else if (alternateFormatter <= 6 && alternateFormatter >= 4) {
                    primaryFormatterVal = 1e3;
                }
                else {
                    primaryFormatterVal = 10;
                }
            }
            formatter = valueFormatter.create({
                format: primaryFormatter, precision: detailLabelProp.labelPrecision,
                value: !detailLabelProp.labelDisplayUnits ? primaryFormatterVal : detailLabelProp.labelDisplayUnits
            });
            summaryValue = thisObj.data.value;
            if (detailLabelProp.labelStyle === "Category, percent of total") {
                percentVal = (d.data.value / summaryValue * hundredLiteral).toFixed(twoLiteral).toString();
                text = `${percentVal}%`;
            }
            else if (detailLabelProp.labelStyle === "Data value, percent of total") {
                percentVal = (d.data.value / summaryValue * hundredLiteral).toFixed(twoLiteral).toString();
                text = `(${percentVal}%)`;
            }
            else if (detailLabelProp.labelStyle === "Both") {
                text = `${formatter.format(d.data.value)}`;
            }
            else {
                percentVal = (d.data.value / summaryValue * hundredLiteral).toFixed(twoLiteral).toString();
                text = `${formatter.format(d.data.value)} (${percentVal}%)`;
            }
            textProperties = {
                fontFamily: thisObj.defaultFontFamily, fontSize: (detailLabelProp.fontSize) + "px", text
            };
            widthOfText = textMeasurementService.measureSvgTextWidth(textProperties);
            pos = outerArc.centroid(d);
            pos[0] = (Math.abs(outerArc.centroid(d)[0]) + twentyLiteral) * (thisObj.midAngle(d) < Math.PI ? 1 : -1);
            // logic to show ellipsis in Data Labels if there is no enough width
            position = (thisObj.midAngle(d) < Math.PI ? 1 : -1);
            if (position === 1) {
                textEnd = pos[0] + widthOfText;
                if (textEnd > width / twoLiteral) {
                    finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, width / twoLiteral - pos[0]);
                    if (finalText.length < 4) {
                        return "";
                    }
                } else { finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, textEnd); }
            } else if (position === -1) {
                textEnd = pos[0] + (-1 * widthOfText);
                if (textEnd < (-1 * width / twoLiteral)) {
                    finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, pos[0] + width / twoLiteral);
                    if (finalText.length < 4) {
                        return "";
                    }
                } else {
                    finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, Math.abs(textEnd));
                }
            }
            return finalText;
        }

        /**
         * Helper function to add Detail Labels
         * @param detailLabelProp                   - detail label properties for the data
         * @param enteringSecondRowText 
         * @param pie 
         * @param data                              - data to be displayed
         * @param secondaryTextGroups 
         * @param labelColor2                       - label colors
         * @param labelSettings                     - settings for the labels
         * @param labelTextSize2                    - label text size
         * @param pos                               - determines position of the label
         * @param outerArc 
         * @param text                              - text to be displayed
         * @param textProperties                    - contains properties for displaying the text
         * @param primaryFormatter                  - primary formatter variable
         * @param alternateFormatter 
         * @param primaryFormatterVal               - primary formatted value
         * @param formatter                         - formatter variable to format the text
         * @param summaryvalue                      - summary value in centre of visual
         * @param percentVal                        - percentage value to be displayed
         * @param widthOfText                       - contains width of the text
         * @param position                          - determines position of the text
         * @param textEnd 
         * @param finalText                         - final formatted text
         * @param defaultFontFamily                 - specifies the default font family
         * @param dataLabelsArr                     - array of data labels
         * @param iterator 
         */
        public forLoopHelperFunction(
            detailLabelProp: IDetailLabels,
            enteringSecondRowText: any,
            pie: any,
            data: any,
            secondaryTextGroups: any,
            labelColor2: string,
            labelSettings: any,
            labelTextSize2: string,
            pos: number[],
            outerArc: d3.svg.Arc<d3.svg.arc.Arc>,
            text: string,
            textProperties: TextProperties,
            primaryFormatter: string,
            alternateFormatter: number,
            primaryFormatterVal: number,
            formatter: IValueFormatter,
            summaryvalue: number,
            percentVal: string,
            widthOfText: number,
            position: number,
            textEnd: number,
            finalText: string,
            defaultFontFamily: "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif",
            dataLabelsArr: any,
            iterator: any) {
            if (detailLabelProp.labelStyle !== "Data" && detailLabelProp.labelStyle !== "Category" && detailLabelProp.labelStyle !== "Percent of total") {
                enteringSecondRowText = thisObj.svg.selectAll(".ring_secondaryLabelName").data(pie(data)).enter();
                secondaryTextGroups = enteringSecondRowText.append("g").attr("class", "ring_secondaryLabelName");
                labelColor2 = labelSettings.color;
                labelTextSize2 = (labelSettings.fontSize) + "px";
                const secondRowLabel: any = secondaryTextGroups.append("text").attr("x", (d: any): number => {
                    pos = outerArc.centroid(d);
                    pos[0] = (Math.abs(outerArc.centroid(d)[0]) + twentyLiteral) * (thisObj.midAngle(d) < Math.PI ? 1 : -1);
                    return pos[0];
                }).attr("y", (d: any): number => {
                    pos = outerArc.centroid(d); text = d && d.data && d.data.name ? d.data.name : "sample";
                    textProperties = { fontFamily: thisObj.defaultFontFamily, fontSize: (detailLabelProp.fontSize) + "px", text };
                    const heightOfText: number = textMeasurementService.measureSvgTextHeight(textProperties);
                    return pos[1] + heightOfText / twoLiteral + fiveLiteral;
                }).attr("dy", ".20em").attr("id", (d: any, j: number): string => {
                    return `ring_secondRowLabel_${j}`;
                }).text((d: any): string => {
                    finalText = this.getFinalText(primaryFormatter, detailLabelProp, alternateFormatter, primaryFormatterVal, formatter, summaryvalue, percentVal,
                        d, text, textProperties, widthOfText, pos, outerArc, position, textEnd, finalText);
                    return finalText;
                }).style("text-anchor", (d: any): string => {
                    return (thisObj.midAngle(d)) < Math.PI ? "start" : "end";
                }).style({
                    "fill": labelColor2, "font-family": defaultFontFamily, "font-size": labelTextSize2,
                }).append("title").text((d: any): string => {
                    if (thisObj.dataViews && thisObj.dataViews.categorical && thisObj.dataViews.categorical.values && thisObj.dataViews.categorical.values[0]) {
                        primaryFormatter = thisObj.dataViews.categorical.values[0].source.format ? thisObj.dataViews.categorical.values[0].source.format
                            : valueFormatter.DefaultNumericFormat;
                    }
                    if (!detailLabelProp.labelDisplayUnits) {
                        if (alternateFormatter > 9) {
                            primaryFormatterVal = 1e9;
                        }
                        else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                            primaryFormatterVal = 1e6;
                        }
                        else if (alternateFormatter <= 6 && alternateFormatter >= 4) {
                            primaryFormatterVal = 1e3;
                        }
                        else {
                            primaryFormatterVal = 10;
                        }
                    }
                    formatter = valueFormatter.create({
                        format: primaryFormatter, precision: detailLabelProp.labelPrecision, value: !detailLabelProp.labelDisplayUnits ? primaryFormatterVal
                            : detailLabelProp.labelDisplayUnits
                    });
                    summaryvalue = thisObj.data.value;
                    if (detailLabelProp.labelStyle === "Category, percent of total") {
                        percentVal = (d.data.value / summaryvalue * hundredLiteral).toFixed(twoLiteral).toString();
                        text = `${percentVal}%`;
                    }
                    else if (detailLabelProp.labelStyle === "Data value, percent of total") {
                        percentVal = (d.data.value / summaryvalue * hundredLiteral).toFixed(twoLiteral).toString();
                        text = `(${percentVal}%)`;
                    }
                    else if (detailLabelProp.labelStyle === "Both") {
                        text = `${formatter.format(d.data.value)}`;
                    }
                    else {
                        percentVal = (d.data.value / summaryvalue * hundredLiteral).toFixed(twoLiteral).toString();
                        text = `${formatter.format(d.data.value)} (${percentVal}%)`;
                    }
                    return text;
                });
                const upperLabelText: string = dataLabelsArr[iterator] && dataLabelsArr[iterator].childNodes && dataLabelsArr[iterator].childNodes[0]
                    && dataLabelsArr[iterator].childNodes[0].textContent ? dataLabelsArr[iterator].childNodes[0].textContent : "no data";
                let expString: string = "";
                if (detailLabelProp.labelStyle === "Category, percent of total" || detailLabelProp.labelStyle === "Both") {
                    expString = "(.*)\\s(.+)";
                }
                else if (detailLabelProp.labelStyle === "Data value, percent of total") {
                    expString = "(.*)\\s\\((.+)\\)";
                }
                else {
                    expString = "(.*)\\s(.+)\\s\\((.+)\\)";
                }
                const pattern: RegExp = new RegExp(expString, "gi");
                // checking the pattern of the data label inorder to display or not
                if (!(upperLabelText && upperLabelText.indexOf("...") > -1) && pattern.test(upperLabelText)) {
                    d3.select(`#ring_secondRowLabel_${dataLabelsArr[iterator]}`).style("display", "none");
                }
            }
        }

        /**
         * Helper function for adding animation
         * @param labelsLength                  - length of detail labels
         * @param detailLabelProp               - detail label properties for the data
         */
        public animationHelperFunction(
            labelsLength: number,
            detailLabelProp: IDetailLabels) {
            if (labelsLength !== 1) {
                let obj1: any, obj2: ClientRect, obj3: ClientRect, rectVariable: any, rectVariable2: any, rectVariable3: any;
                for (let iterator: number = 0; iterator < labelsLength; iterator++) {
                    rectVariable = d3.select("#ring_label_" + iterator)[0][0];
                    obj1 = rectVariable.getBoundingClientRect();
                    for (let jiterator: number = iterator + 1; jiterator <= labelsLength - 1; jiterator++) {
                        rectVariable2 = d3.select(`#ring_label_${jiterator}`)[0][0];
                        obj2 = rectVariable2.getBoundingClientRect();
                        let condExpr: boolean = !(obj2.left > obj1.right || obj2.right < obj1.left || obj2.top > obj1.bottom || obj2.bottom < obj1.top);
                        if (detailLabelProp.labelStyle !== "Data" && detailLabelProp.labelStyle !== "Category" && detailLabelProp.labelStyle !== "Percent of total") {
                            rectVariable3 = d3.select(`#ring_secondRowLabel_${iterator}`)[0][0];
                            obj3 = rectVariable3.getBoundingClientRect();
                            condExpr = !(obj2.left > obj1.right || obj2.right < obj1.left || obj2.top > obj1.bottom || obj2.bottom < obj1.top) ||
                                (!(obj2.left > obj3.right || obj2.right < obj3.left || obj2.top > obj3.bottom || obj2.bottom < obj3.top) &&
                                    !!d3.select(`#ring_secondRowLabel_${iterator}`) && document.getElementById(`ring_secondRowLabel_${iterator}`).style.display !== "none");
                            if (!condExpr) {
                                rectVariable3 = d3.select(`#ring_secondRowLabel_${jiterator}`)[0][0]; obj3 = rectVariable3.getBoundingClientRect();
                                condExpr = (!(obj1.left > obj3.right || obj1.right < obj3.left || obj1.top > obj3.bottom || obj1.bottom < obj3.top) &&
                                    !!d3.select(`#ring_secondRowLabel_${jiterator}`) && document.getElementById(`ring_secondRowLabel_${jiterator}`).style.display !== "none");
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
                    let labelYPos: number = 0, secondLabelYPos: number = 0;
                    labelYPos = parseFloat($(`#ring_label_${iterator}`).attr("y"));
                    if (labelYPos && labelYPos < 0) {
                        labelYPos = labelYPos * 0.9; labelYPos = labelYPos - obj1.height + 3; // 0.2em is the dy value. On conversion to px it will be 3px
                        labelYPos = Math.abs(labelYPos);
                    } else { labelYPos = (labelYPos * 0.9) + 3; } // 0.2em is the dy value. On conversion to px it will be 3px
                    secondLabelYPos = Math.abs(parseFloat($(`#ring_secondRowLabel_${iterator}`).attr("y"))) ?
                        Math.abs(parseFloat($(`#ring_secondRowLabel_${iterator}`).attr("y"))) + 3 : 0;
                    // 0.2em is the dy value. On conversion to px it will be 3px
                    const visualHeight: number = height / twoLiteral * 0.9;
                    // 0.9 is the random value for adjusting labels cropping issue
                    if (labelYPos > parseFloat(visualHeight.toString()) || (secondLabelYPos > parseFloat(visualHeight.toString())) &&
                        d3.select(`#ring_secondRowLabel_${iterator}`) && document.getElementById(`ring_secondRowLabel_${iterator}`).style.display !== "none") {
                        d3.select(`#ring_label_${iterator}`).style("display", "none");
                        d3.select(`#ring_polyline_${iterator}`).style("display", "none");
                        if (d3.select(`#ring_secondRowLabel_${iterator}`)) {
                            d3.select(`#ring_secondRowLabel_${iterator}`).style("display", "none");
                        }
                    }
                }
            }
        }

        /**
         * Method to show ellipsis for Data Labels when they cross the threshold font size for particular viewport
         * @param position                      - determines position of data labels
         * @param textEnd
         * @param widthOfText                   - width of the text 
         * @param finalText                     - final formatted text
         * @param d 
         * @param pos
         * @param textProperties 
         * @param detailLabelProp               - detail label properties for the data
         * @param formatter                     - formatter variable to format the text
         * @param widthOfText1                  
         * @param textEnd1 
         */
        public updateDataLabelsToShowEllipsis(position, textEnd, widthOfText, finalText, d, pos, textProperties, detailLabelProp, formatter, widthOfText1, textEnd1) {
            position = (thisObj.midAngle(d) < Math.PI ? 1 : -1);
            if (position === 1) {
                textEnd = pos[0] + widthOfText;
                if (textEnd > width / twoLiteral) {
                    finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, width / 2 - pos[0]);
                    if (finalText.length < 4) {
                        return "";
                    }
                } else {
                    finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, textEnd);
                }
            } else if (position === -1) {
                textEnd = pos[0] + (-1 * widthOfText);
                if (textEnd < (-1 * width / twoLiteral)) {
                    finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, pos[0] + width / twoLiteral);
                    if (finalText.length < 4) {
                        return "";
                    }
                } else {
                    finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, Math.abs(textEnd));
                }
            }
            if (finalText.indexOf("...") > -1 && detailLabelProp.labelStyle !== "Data" && detailLabelProp.labelStyle !== "Category"
                && detailLabelProp.labelStyle !== "Percent of total") {
                let firstRowLabel: string;
                if (detailLabelProp.labelStyle === "Data value, percent of total") {
                    firstRowLabel = formatter.format(d.data.value);
                }
                else {
                    firstRowLabel = d.data.name;
                }
                textProperties.text = firstRowLabel;
                widthOfText1 = textMeasurementService.measureSvgTextWidth(textProperties);
                if (position === 1) {
                    textEnd1 = pos[0] + widthOfText1;
                    if (textEnd1 > width / twoLiteral) {
                        finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, width / twoLiteral - pos[0]);
                        if (finalText.length < 4) {
                            return "";
                        }
                    } else {
                        finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, textEnd1);
                    }
                } else if (position === -1) {
                    textEnd1 = pos[0] + (-1 * widthOfText1);
                    if (textEnd1 < (-1 * width / twoLiteral)) {
                        finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, pos[0] + width / twoLiteral);
                        if (finalText.length < 4) {
                            return "";
                        }
                    } else {
                        finalText = textMeasurementService.getTailoredTextOrDefault(textProperties, Math.abs(textEnd1));
                    }
                }
            }
            return finalText;
        }

        /**
         * Method to add Detail Labels
         * @param data              - data to be displayed
         * @param radius            - radius of the circle
         */
        public addDetailLabels(data: any, radius: any) {
            const pie: any = d3.layout.pie().sort(null).value((d: any): any => Math.abs(d.value));
            const enteringLabels: any = thisObj.svg.selectAll(".ring_polyline").data(pie(data)).enter();
            const outerArc = d3.svg.arc().outerRadius(radius * 1.04).innerRadius(radius * 1.04), innerarc = d3.svg.arc().outerRadius(radius).innerRadius(radius * 0.85);
            const labelGroups: any = enteringLabels.append("g").attr("class", "ring_polyline");
            let line: any, arccentroid: any, pos: any, pos1: any, fpos: number[], fpos1: number[];
            line = labelGroups.append("polyline").attr("points", (d: any): any => {
                arccentroid = innerarc.centroid(d);
                pos = outerArc.centroid(d);
                pos1 = outerArc.centroid(d);
                pos[0] = (Math.abs(pos1[0]) + tenthLiteral) * (thisObj.midAngle(d) < Math.PI ? 1 : -1);
                fpos = [(arccentroid[0] + pos1[0]) / twoLiteral, (arccentroid[1] + pos1[1]) / twoLiteral];
                fpos1 = [(fpos[0] + pos1[0]) / twoLiteral, (fpos[1] + pos1[1]) / twoLiteral];
                return [fpos1, pos1, pos];
            }).attr("id", (d: any, i: number): string => {
                return `ring_polyline_${i}`;
            });
            const detailLabelProp: IDetailLabels = this.getDetailLabel(this.dataViews), centralLabelProp: CentralLabel = this.getCentralLabel(this.dataViews);
            const enteringText: any = thisObj.svg.selectAll(".ring_labelName").data(pie(data)).enter();
            const textGroups: any = enteringText.append("g").attr("class", "ring_labelName");
            const labelSettings: any = thisObj.settings.detailLabels, labelcolor: string = labelSettings.color;
            const labelTextSize: string = (labelSettings.fontSize) + "px", defaultFontFamily = "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif";
            let primaryFormatter: string = valueFormatter.DefaultNumericFormat, primaryFormatterVal: number = 0;
            let alternateFormatter: number, text: string = "", textEnd: number;
            let finalText: string, formatter: IValueFormatter, summaryValue: number = 0, val: string = "";
            let val1: string = "", val2: string = "", cat: string = "", percentVal: string = "";
            let textProperties: TextProperties, widthOfText: number = 0, position: number = 0, widthOfText1: number = 0, textEnd1: number = 0;
            const label: any = textGroups.append("text").attr("x", (d: any): number => {
                pos = outerArc.centroid(d); pos[0] = (Math.abs(outerArc.centroid(d)[0]) + twentyLiteral) * (thisObj.midAngle(d) < Math.PI ? 1 : -1);
                return pos[0];
            }).attr("y", (d: any): number => {
                pos = outerArc.centroid(d);
                return pos[1];
            }).attr("dy", ".20em").attr("id", (d: any, i: number): string => {
                return `ring_label_${i}`;
            }).text((d: any): string => {
                if (thisObj.dataViews && thisObj.dataViews.categorical && thisObj.dataViews.categorical.values && thisObj.dataViews.categorical.values[0]) {
                    primaryFormatter = thisObj.dataViews.categorical.values[0].source.format ? thisObj.dataViews.categorical.values[0].source.format 
                        : valueFormatter.DefaultNumericFormat;
                }
                primaryFormatterVal = this.addDetailLabelsHelperFunctionTwo(detailLabelProp, alternateFormatter, d, primaryFormatterVal);
                formatter = valueFormatter.create({
                    format: primaryFormatter, precision: detailLabelProp.labelPrecision, value: !detailLabelProp.labelDisplayUnits ?
                        primaryFormatterVal : detailLabelProp.labelDisplayUnits
                });
                summaryValue = thisObj.data.value;
                text = this.addDetailLabelsHelperFunctionOne(detailLabelProp, text, formatter, d, val, summaryValue, val1, cat);
                textProperties = { fontFamily: thisObj.defaultFontFamily, fontSize: (detailLabelProp.fontSize) + "px", text };
                widthOfText = textMeasurementService.measureSvgTextWidth(textProperties);
                pos = outerArc.centroid(d);
                pos[0] = (Math.abs(outerArc.centroid(d)[0]) + twentyLiteral) * (thisObj.midAngle(d) < Math.PI ? 1 : -1);
                // logic to show ellipsis in Data Labels if there is no enough width
                finalText = this.updateDataLabelsToShowEllipsis(position, textEnd, widthOfText, finalText, d, pos, textProperties, 
                    detailLabelProp, formatter, widthOfText1, textEnd1);
                return finalText;
            }).style("text-anchor", (d: any): string => {
                return (thisObj.midAngle(d)) < Math.PI ? "start" : "end";
            }).style({ "fill": labelcolor, "font-family": defaultFontFamily, "font-size": labelTextSize }).append("title")
                .text((d: any): string => {
                    if (thisObj.dataViews && thisObj.dataViews.categorical && thisObj.dataViews.categorical.values && thisObj.dataViews.categorical.values[0]) {
                        primaryFormatter = thisObj.dataViews.categorical.values[0].source.format ? thisObj.dataViews.categorical.values[0].source.format
                            : valueFormatter.DefaultNumericFormat;
                    }
                    if (!detailLabelProp.labelDisplayUnits) {
                        if (alternateFormatter > 9) {
                            primaryFormatterVal = 1e9;
                        }
                        else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                            primaryFormatterVal = 1e6;
                        }
                        else if (alternateFormatter <= 6 && alternateFormatter >= 4) {
                            primaryFormatterVal = 1e3;
                        }
                        else {
                            primaryFormatterVal = 10;
                        }
                    }
                    formatter = valueFormatter.create({
                        format: primaryFormatter, precision: detailLabelProp.labelPrecision, value: !detailLabelProp.labelDisplayUnits
                            ? primaryFormatterVal : detailLabelProp.labelDisplayUnits
                    });
                    summaryValue = thisObj.data.value;
                    text = this.addDetailLabelsHelperFunctionThree(detailLabelProp, text, formatter, d, val, summaryValue, val1, val2, cat, percentVal);
                    return text;
                });
            // Logic to add second row labels
            const dataLabels: d3.Selection<SVGElement> = this.svg.selectAll("g.ring_labelName text");
            let enteringSecondRowtext: any, secondaryTextGroups: any, labelColor2: string = "", labelTextSize2: string = "";
            const dataLabelsArr: any = dataLabels && dataLabels[0] ? dataLabels[0] : [];
            for (const iterator of dataLabelsArr) {
                this.forLoopHelperFunction(detailLabelProp, enteringSecondRowtext, pie, data, secondaryTextGroups, labelColor2, labelSettings, labelTextSize2, pos, 
                    outerArc, text, textProperties, primaryFormatter, alternateFormatter, primaryFormatterVal, formatter, summaryValue, 
                    percentVal, widthOfText, position, textEnd, finalText, defaultFontFamily, dataLabelsArr, iterator);
            }
            const labelsLength: number = data.length;
            // for last stage of animation
            this.animationHelperFunction(labelsLength, detailLabelProp);
        }

        /**
         * Method that gets the arc color
         * @param color             - contains info of arc color
         * @param index 
         */
        public getArcColor(color: any, index: number) {
            return d3.rgb(color).brighter(index / twoLiteral);
        }

        /**
         * This function gets called for each of the
         * objects defined in the capabilities files and allows you to select which of the
         * objects and properties you want to expose to the users in the property pane.
         * @param {EnumerateVisualObjectInstancesOptions} options       - Map of defined objects
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            const objectName: string = options.objectName, objectEnumeration: VisualObjectInstance[] = [];
            switch (objectName) {
                case "legend":
                    if (this.settings.legend.show) {
                        objectEnumeration.push({
                            objectName, properties: {
                                fontSize: this.settings.legend.fontSize,
                                show: this.settings.legend.show,
                                title: this.settings.legend.title
                            }, selector: null,
                        });
                        if (this.settings.legend.title) {
                            objectEnumeration.push({
                                objectName, properties: {
                                    titleText: this.settings.legend.titleText === "" ? legendDisplay : this.settings.legend.titleText
                                }, selector: null,
                            });
                        }
                        objectEnumeration.push({
                            objectName, properties: {
                                color: this.settings.legend.color,
                                position: this.settings.legend.position
                            }, selector: null,
                        });
                    } else {
                        objectEnumeration.push({
                            objectName, properties: {
                                show: this.settings.legend.show
                            }, selector: null,
                        });
                    }
                    return objectEnumeration;
                case "colorSelector":
                    for (const count of this.legendDataPoints.dataPoints) {
                        objectEnumeration.push({
                            displayName: count.label, objectName, properties: { fill: { solid: { color: count.color } } }, selector: count.identity.getSelector()
                        });
                    }
                    return objectEnumeration;
                case "dataLabels":
                    objectEnumeration.push({
                        objectName, properties: { show: this.settings.dataLabels.show }, selector: null,
                    });
                    if (this.settings.dataLabels.show) {
                        objectEnumeration.push({
                            objectName, properties: {
                                backgroundColor: this.settings.dataLabels.backgroundColor, color: this.settings.dataLabels.color,
                                fontFamily: this.settings.dataLabels.fontFamily, fontSize: this.settings.dataLabels.fontSize,
                            }, selector: null,
                        });
                    }
                    return objectEnumeration;
                case "detailLabels":
                    objectEnumeration.push({
                        objectName, properties: { show: this.settings.detailLabels.show }, selector: null,
                    });
                    if (this.settings.detailLabels.show) {
                        objectEnumeration.push({
                            objectName, properties: {
                                color: this.settings.detailLabels.color, fontSize: this.settings.detailLabels.fontSize,
                                labelDisplayUnits: this.settings.detailLabels.labelDisplayUnits, 
                                labelPrecision: this.limitValue(this.lowerLimitValue(this.settings.detailLabels.labelPrecision, 0), 4),
                                labelStyle: this.settings.detailLabels.labelStyle,
                            }, selector: null,
                        });
                    }
                    return objectEnumeration;
                case "centralLabel":
                    objectEnumeration.push({
                        objectName, properties: { show: this.settings.centralLabel.show }, selector: null,
                    });
                    if (this.settings.centralLabel.show) {
                        objectEnumeration.push({
                            objectName, properties: {
                                color: this.settings.centralLabel.color, fontFamily: this.settings.centralLabel.fontFamily,
                                fontSize: this.settings.centralLabel.fontSize, labelDisplayUnits: this.settings.centralLabel.labelDisplayUnits,
                                labelPrecision: this.limitValue(this.lowerLimitValue(this.settings.centralLabel.labelPrecision, 0), 4),
                                show: this.settings.centralLabel.show, text: this.settings.centralLabel.text
                            }, selector: null,
                        });
                    }
                    return objectEnumeration;
                case "animation":
                    objectEnumeration.push({ objectName, properties: { show: this.settings.animation.show }, selector: null, });
                    return objectEnumeration;
                case "configuration":
                    objectEnumeration.push({
                        objectName, properties: {
                            arcRadius: this.checkRadius(), cornerRadius: Number(this.limitValue(this.lowerLimitValue
                                (this.settings.configuration.cornerRadius, 0), tenthLiteral).toFixed(twoLiteral)),
                            padding: Number(this.limitValue(this.lowerLimitValue(this.settings.configuration.padding, 0),
                                tenthLiteral).toFixed(twoLiteral)), strokeColor: this.settings.configuration.strokeColor, fill: this.settings.configuration.fill,
                        }, selector: null,
                    });
                    return objectEnumeration;
                default: break;
            }
            return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        }

        /**
         * Method that handles the creation and deletion of Landing Page
         * @param options                - Contains references to the size of the container and the dataView which contains all the data the visual had queried.
         */
        private handleLandingPage(options: VisualUpdateOptions): void {
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

        /**
         * Method to create Landing Page
         */
        private createsampleLandingPage(): Element {
            const page: any = d3.select(this.optionsUpdate.element)
                .append("div")
                .classed("LandingPage", true);
            page.append("text")
                .classed("landingPageHeader", true)
                .text("Sunburst Chart by MAQ Software")
                .append("text")
                .classed("landingPageText", true)
                .text("Sunburst Chart visual categorizes the data into the groups and show the data in Hierarchical structure");
            return page;
        }

        /**
         * Method to sync the previous selected state on bookmarks
         * @param selection                     - holds the value of selected arc
         * @param legendSelection               - holds the value of selected legend
         * @param {ISelectionId} selectionIds - Id assigned to data point for cross filtering and visual interaction.
         * @param pathSelectionArray 
         */
        private syncSelectionState(
            selection: d3.Selection<any>,
            legendSelection: d3.Selection<any>,
            selectionIds: ISelectionId[],
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
                        ? highOpacity
                        : lowOpacity
                );
            }
            let isLegendSelected: boolean = false;
            legendSelection.each(function (legendPoint: any) {
                isLegendSelected = false;
                if (legendPoint.tooltip === legendPointString) {
                    isLegendSelected = true;
                }
                d3.select(this).style(
                    "opacity",
                    isLegendSelected
                        ? highOpacity
                        : lowOpacity
                );
            });
        }

        /**
         * Method to push child elements to the globalArray
         * @param d 
         */
        private visibleArrayChildren(d: any) {
            if (d.children) {
                for (const iterator of d.children) {
                    globalVisibleArray.push(iterator);
                    this.visibleArrayChildren(iterator);
                }
            }
        }

        /**
         * Method to push parent elements to the globalArray
         * @param d 
         */
        private visibleArrayParent(d: any) {
            if (d.parent) {
                globalVisibleArray.push(d.parent);
            }
        }

        /**
         * Method to check whether selection Ids is present or not
         * @param {ISelectionId} selectionIds - Id assigned to data point for cross filtering and visual interaction.
         * @param selectionId
         */
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

        /**
         * Method to set the property selected on click of the arc
         * @param d 
         * @param root 
         */
        private markDataPointsAsSelectedOnArc(d: any, root: any): void {
            for (let iterator: number = 0; iterator < root.length; iterator++) {
                if (d.parent === root[iterator][dataLiteral]) {
                    root[iterator][dataLiteral].selected = true;
                }
            }
            if (d.parent.name !== "") {
                this.markDataPointsAsSelectedOnArc(d.parent, root);
            }
        }

        /**
         * Method to set the property selected on click of the legend
         * @param d                     
         * @param root      
         */
        private markLegendPointsAsSelectedOnArc(d: any, root: any): void {
            for (let iterator: number = 0; iterator < root.length; iterator++) {
                root[iterator][dataLiteral].selected = false;
                if (d.tooltip === root[iterator][dataLiteral].legendClass) {
                    root[iterator][dataLiteral].selected = true;
                }
            }
        }

        /**
         * Method to get the Default Detail Labels Settings
         */
        private getDefaultDetailLabel(): IDetailLabels {
            return <IDetailLabels>{
                color: "#808080",
                fontSize: 9,
                labelDisplayUnits: 0,
                labelPrecision: 0,
                labelStyle: "Category",
                show: true
            };
        }

        /**
         * Method to get the Default Central Labels Settings
         */
        private getDefaultCentralLabel(): CentralLabel {
            return <CentralLabel>{
                color: "#808080",
                fontSize: 11,
                labelDisplayUnits: 0,
                labelPrecision: 0,
                show: true,
                text: "Total",
            };
        }

        /**
         * Method to get the Detail Labels Settings
         * @param {DataView} dataView              - the dataview object, which contains all data needed to render the visual.
         */
        private getDetailLabel(dataView: DataView): IDetailLabels {
            let objects: DataViewObjects = null;
            const labelSettings: IDetailLabels = this.getDefaultDetailLabel();
            if (!dataView.metadata || !dataView.metadata.objects) {
                return this.getDefaultDetailLabel();
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

        /**
         * Method to get the Central Labels Settings
         * @param {DataView} dataView              - the dataview object, which contains all data needed to render the visual. 
         */
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

        /**
         * Method to wrap the datalabels text
         * @param padding           - padding for the data labels text
         */
        private wrapPathText(padding?: number): (slice: any, index: number) => void {
            const self = this;
            return function (sliced: any, index: number) {
                if (!sliced.depth) {
                    return;
                }
                const selection: d3.Selection<any> = d3.select(this);
                const breadth = (<SVGPathElement>d3.select(selection.attr("xlink:href")).node()).getTotalLength();
                self.wrapText(selection, padding, breadth);
            };
        }

        /**
         * Method that wraps the text
         * @param selection 
         * @param padding 
         * @param widthText 
         */
        private wrapText(selection: d3.Selection<any>, padding?: number, widthText?: number): void {
            const node: SVGTextElement = <SVGTextElement>selection.node();
            let textLength: number = node.getComputedTextLength();
            let text: string = selection.text();
            widthText = widthText || 0;
            padding = padding || 0;
            while (textLength > (widthText - twoLiteral * padding) && text.length > 0) {
                text = text.slice(0, -1);
                selection.text(text + textLiteral);
                textLength = node.getComputedTextLength();
            }
            if (textLength > (widthText - twoLiteral * padding)) {
                selection.text("");
            }
        }

        /**
         * Method to get the Tooltip Data
         * @param value 
         */
        private getTooltipData(value: any): VisualTooltipDataItem[] {
            let tooltipDataPointsFinal: VisualTooltipDataItem[];
            let primaryFormatter: string = valueFormatter.DefaultNumericFormat;
            primaryFormatter = thisObj.dataViews.categorical.values[0].source.format ?
                thisObj.dataViews.categorical.values[0].source.format : valueFormatter.DefaultNumericFormat;
            tooltipDataPointsFinal = [];
            const formatter: IValueFormatter = valueFormatter.create({
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