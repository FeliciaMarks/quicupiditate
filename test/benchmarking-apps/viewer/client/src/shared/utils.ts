import { WritableMeasurementKeys } from '@benchmarking-apps/test-result';
import * as d3 from 'd3';

export function round(value: number, factor = 100): number {
  return Math.round(value * factor) / factor;
}
export class VersionedItem {
  public constructor(
    public readonly name: string,
    public readonly version: string
  ) { }
}

export class Margin {
  public constructor(
    public readonly top: number,
    public readonly right: number,
    public readonly bottom: number,
    public readonly left: number,
  ) { }
}

export class Action {
  public constructor(
    public readonly description: string,
    public color?: string,
  ) { }
}

export const actions: Record<WritableMeasurementKeys, Action> = {
  'durationInitialLoad': new Action('Initial load', d3.schemeCategory10[0]),
  'durationPopulation': new Action('Populate grid', d3.schemeCategory10[1]),
  'durationUpdate': new Action('Update every 10th row', d3.schemeCategory10[2]),
  'durationConditional': new Action('Conditional content', d3.schemeCategory10[3]),
  'durationTextUpdate': new Action('Bulk text update, localized content', d3.schemeCategory10[4]),
  'durationSorting': new Action('Sort data', d3.schemeCategory10[5]),
  'durationFilter': new Action('Filter data', d3.schemeCategory10[6]),
  'durationSelectFirst': new Action('Select first row', d3.schemeCategory10[7]),
  'durationDeleteFirst': new Action('Delete first row', d3.schemeCategory10[8]),
  'durationDeleteAll': new Action('Delete all rows', d3.schemeCategory10[9]),
};

// // If we are interpolating on the spectral scale (refer: https://github.com/d3/d3-scale-chromatic/blob/master/README.md#interpolateSpectral).
// // The interpolation gives us flexibility of having more than 10-12 categories.
// // By increasing the number of `colorBuckets`, we can create partitions of equal size in the [0,1] range.
// // This can produce contrasting colors, as due to partition, color are not consecutive.
// const colorBuckets = 1;
// const sequence: WritableMeasurementKeys[] = Object.keys(actions) as WritableMeasurementKeys[];
// const seqLen = sequence.length;
// const colorRanges: [number, number][] = new Array<[number, number]>(colorBuckets);
// const band = round(1 / colorBuckets);
// for (let i = 0; i < colorBuckets; i++) {
//   colorRanges[i] = [
//     i === 0 ? 0 : round((i * band) + 0.01),
//     i === colorBuckets - 1 ? 1 : round((i + 1) * band)
//   ];
// }
// const buckets = new Array<number[]>(colorBuckets);
// for (let i = 0; i < seqLen; i++) {
//   const j = i % colorBuckets;
//   (buckets[j] ?? (buckets[j] = [])).push(i);
// }
// const colorScales: d3.ScaleBand<number>[] = buckets.map((b, i) => d3.scaleBand(b, colorRanges[i]));
// for (let i = 0; i < seqLen; i++) {
//   actions[sequence[i]].color = d3.interpolateSpectral(colorScales[i % colorBuckets](i));
// }
