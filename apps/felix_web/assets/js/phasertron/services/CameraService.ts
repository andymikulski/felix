import { vec2magnitude } from '../utils/ai/navmesh/NavMeshAgent';
import FloatSpring from '../utils/springs/FloatSpring';
import Vector2Spring, { Vector2Like } from '../utils/springs/Vector2Spring';
import { CastToSceneService } from './SceneService.gen';
import ServiceContainer, { IService } from './ServiceContainer';

export interface ICameraService {
  getCamera(): Phaser.Cameras.Scene2D.Camera;
  stepCameraZoom(direction: 1 | -1): number;
  setCameraZoom(zoom: number): void;
  setTarget(target: Vector2Like | null): void;
}

export class CameraService implements IService, ICameraService {
  private camera: Phaser.Cameras.Scene2D.Camera;

  private zoomSpring = new FloatSpring(0.125, 1);
  private posSpring = new Vector2Spring(0.45, 0.9);

  private maxZoom = 10;
  private minZoom = 1;

  private target: Vector2Like | null = null;

  initializeService(): void {}
  onServicesReady(): void {
    const scene = ServiceContainer.getService(CastToSceneService).getScene();
    this.camera = scene.cameras.main;

    this.zoomSpring.setGoal(this.camera.zoom);
    this.zoomSpring.setValue(this.camera.zoom);

    this.posSpring.setGoal(this.camera.worldView);
    this.posSpring.setValue(this.camera.worldView);

    // scene.input.on(
    //   'wheel',
    //   (
    //     pointer: Phaser.Input.Pointer,
    //     gameObjects: Phaser.GameObjects.GameObject[],
    //     deltaX: number,
    //     deltaY: number,
    //     deltaZ: number
    //   ) => {
    //     if (deltaY === 0) return;
    //     this.stepCameraZoom(deltaY > 0 ? -1 : 1);
    //   }
    // );

    // let isDragging = false;
    // let startPos = { x: 0, y: 0 };
    // let lastScrollPos = { x: 0, y: 0 };
    // scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    //   if (pointer.rightButtonDown()) {
    //     isDragging = true;
    //     startPos = { x: pointer.x, y: pointer.y };
    //     lastScrollPos = { x: this.camera.scrollX, y: this.camera.scrollY };

    //     this.posSpring.setGoal(lastScrollPos);
    //     this.posSpring.setValue(lastScrollPos);
    //     this.posSpring.setHalfLife(0.01);
    //   }
    // });
    // scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    //   if (isDragging) {
    //     this.posSpring.setGoal({
    //       x: lastScrollPos.x + (startPos.x - pointer.x) / this.zoomSpring.Value,
    //       y: lastScrollPos.y + (startPos.y - pointer.y) / this.zoomSpring.Value,
    //     });
    //   }
    // });
    // scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    //   if (pointer.rightButtonReleased()) {
    //     isDragging = false;
    //     this.posSpring.setHalfLife(0.05);
    //   }
    // });

    scene.events.on('update', this.update);
  }

  setTarget(target: Vector2Like | null): void {
    this.target = target;
  }

  private update = (time: number, delta: number) => {
    const target = { x: 0, y: 0 };
    if (this.target) {
      target.x = this.target.x;
      target.y = this.target.y;

      // center on screen
      target.x -= this.camera.width / 2; // / this.zoomSpring.Value;
      target.y -= this.camera.height / 2; // / this.zoomSpring.Value;
    }

    this.posSpring.setGoal(target);

    this.zoomSpring.update(delta / 1000);
    this.posSpring.update(delta / 1000);
    this.camera.setZoom(this.zoomSpring.Value);
    this.camera.setScroll(this.posSpring.Value.x, this.posSpring.Value.y);
  };

  getCamera = () => {
    return this.camera;
  };

  stepCameraZoom = (direction: 1 | -1) => {
    const nextVal = Math.min(
      this.maxZoom,
      Math.max(this.minZoom, this.zoomSpring.GoalValue + 0.5 * direction)
    );
    this.zoomSpring.setGoal(nextVal);
    return this.zoomSpring.GoalValue;
  };

  setCameraZoom = (zoom: number) => {
    this.zoomSpring.setGoal(
      Math.min(this.maxZoom, Math.max(this.minZoom, zoom))
    );
  };
}
