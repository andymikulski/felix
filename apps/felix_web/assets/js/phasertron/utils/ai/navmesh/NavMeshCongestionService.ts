import { CastToSceneService } from '../../../services/SceneService.gen';
import ServiceContainer, { IService } from '../../../services/ServiceContainer';
import { bresenhamPlotLine } from '../../BresenhamsLine';
import HeatMap2D, { IHeatSource } from '../../Heatmap';

export const USE_CONGESTION_SERVICE = false;

export interface INavMeshCongestionService extends IService {
  setCongestionLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    value: number
  ): void;
  addCongestionAt(x: number, y: number, value: number): void;
  update(time: number, delta: number): void;
  getCongestionAt(x: number, y: number): number;
  sampleCongestionAlongLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number;
  addHeatSource(source: IHeatSource): void;
}

export class MockNavMeshCongestionService implements INavMeshCongestionService {
  initializeService(): void | Promise<void> {
    console.log('Mock congestion service initialized');
    return;
  }
  onServicesReady(): void | Promise<void> {
    return;
  }
  setCongestionLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    value: number
  ): void {
    return;
  }
  update(time: number, delta: number): void {
    return;
  }
  getCongestionAt(x: number, y: number): number {
    return 0;
  }
  sampleCongestionAlongLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    return 0;
  }
  addCongestionAt(x: number, y: number, value: number): void {
    return;
  }
  addHeatSource(source: IHeatSource): void {
    return;
  }
}

export default class NavMeshCongestionService
  implements INavMeshCongestionService
{
  addHeatSource(source: IHeatSource): void {
    this.congestionMap.registerHeatSource(source);
  }
  congestionMap: HeatMap2D;
  graphics: Phaser.GameObjects.Graphics;

  sampleCongestionAlongLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    let i = 0;
    let j = 0;
    let total = 0;
    bresenhamPlotLine(x1, y1, x2, y2, (x, y) => {
      i += 1;
      if (i < 25) {
        return;
      }
      j += 1;
      i = 0;

      const value = this.getCongestionAt(x, y);
      total += value;
    });

    return total;
  }

  addCongestionAt(x: number, y: number, value: number): void {
    this.congestionMap.addValueAt(x, y, value, 10);
  }

  initializeService(): void | Promise<void> {
    this.congestionMap = new HeatMap2D(
      1024,
      768,
      0,
      Number.MAX_VALUE,
      false,
      2,
      1
    );
  }
  onServicesReady(): void | Promise<void> {
    console.log('congestion service');
    const scene = ServiceContainer.getService(CastToSceneService).getScene();
    scene.events.on('update', this.update);
  }

  public setCongestionLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    value: number
  ) => {
    // const scene = ServiceContainer.getService(CastToSceneService).getScene();
    let i = 0;
    let j = 0;
    bresenhamPlotLine(x1, y1, x2, y2, (x, y) => {
      i += 1;
      j += 1;
      if (i < 25) {
        return;
      }
      i = 0;
      this.congestionMap.setValueAt(x, y, value, 10);
    });
  };

  public update = (time: number, delta: number) => {
    this.congestionMap.fixedUpdate(delta);
  };

  public getCongestionAt = (x: number, y: number) => {
    return this.congestionMap.getValueAt(x, y);
  };
}
