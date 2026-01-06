declare module 'd3-delaunay' {
  export class Delaunay {
    static from(points: number[][]): Delaunay;
    voronoi(bounds: number[]): Voronoi;
  }

  export class Voronoi {
    cellPolygon(i: number): number[][] | null;
  }
}