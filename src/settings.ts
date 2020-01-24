/*
 *  Power BI Visualizations
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
  import DataViewObjectsParser = powerbi.extensibility.utils.dataview.DataViewObjectsParser;

  /**
   * VisualSettings class contains class variables.
   */
  export class VisualSettings extends DataViewObjectsParser {
    public configuration: Configuartion = new Configuartion();
    public colorSelector: DataPointSettings = new DataPointSettings();
    public legend: Legend = new Legend();
    public dataLabels: DataLabels = new DataLabels();
    public detailLabels: DetailLabelSettings = new DetailLabelSettings();
    public centralLabel: CentralLabel = new CentralLabel();
    public animation: Animation = new Animation();
  }
  /**
   * DataLabels class contains variables for Data Labels.
   */
  // tslint:disable-next-line: max-classes-per-file
  export class DataLabels {
    public show: boolean = true;
    public fontSize: number = 11;
    public fontFamily: string = "Segoe UI";
    public color: string = "#000";
    public backgroundcolor: string = "#000";
  }
  /**
   * DetailLabels class contains variables for Detail Labels.
   */
  // tslint:disable-next-line: max-classes-per-file
  export class DetailLabelSettings {
    public show: boolean = false;
    public color: string = "#000";
    public fontSize: number = 8;
    public labelDisplayUnits: number = 0;
    public labelPrecision: number = 0;
    public labelStyle: string = "Data";
  }
   /**
    * Animation class contains variables to show animation.
    */
    // tslint:disable-next-line:max-classes-per-file
  export class Animation {
    public show: boolean = false;
  }
  /**
   * CentralLabels class contains variables for Central Labels.
   */
  // tslint:disable: max-classes-per-file
  export class CentralLabel {
    public show: boolean = true;
    public text: string = "Total";
    public color: string = "#000";
    public fontSize: number = 8;
    public labelDisplayUnits: number = 0;
    public labelPrecision: number = 0;
    public fontFamily: string = "Segoe UI";
  }
  /**
   * Legend class contains variables to draw Legend.
   */
  export class Legend {
    public show: boolean = true;
    public fontSize: number = 8;
    public color: string = "#808080";
    public title: boolean = true;
    public titleText: string = "";
    public position: string = "Top";
  }
  /**
   * Configuartion class contains variables to configure the arcs.
   */
  export class Configuartion {
    public arcradius: number = 0;
    public cornerradius: number = 0;
    public padding: number = 0.00;
    public strokecolor: string = "#FFF";
    public fill: string = "#FFF";
  }
  /**
   * DataPointSettings class contains variables for Data Point.
   */
  export class DataPointSettings {
    public fill: string = "";
  }

}
