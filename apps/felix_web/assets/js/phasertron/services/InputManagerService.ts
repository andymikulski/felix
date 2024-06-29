export interface IInputManagerService {
  registerStrategy(strat: IInputStrategy): void;
  registerMultipleStrategies(strats: IInputStrategy[]): void;
  unregisterStrategy(strat: IInputStrategy): void;
}

import { CastToSceneService } from './SceneService.gen';
import ServiceContainer, { IService } from './ServiceContainer';

export type PhaserInputEventType =
  | 'keydown'
  | 'keyup'
  | 'keycombomatch'
  | 'pointerup'
  | 'pointermove'
  | 'pointerdown'
  | 'wheel'
  | 'gamepad:button:down'
  | 'gamepad:button:up'
  | 'gamepad:joystick:right'
  | 'gamepad:joystick:left'
  | 'onbeforeunload';

/**
 * Defines which incoming "raw" Phaser/input event should be triggered on registered input strategies.
 * Ex: If we receive a `pointermove` event, then the InputManager will trigger `onPointerMove` handlers.
 */
export const phaserInputHandlerMap: Record<string, keyof IInputStrategy> = {
  // Events emitted by Phaser's built-in `input` system
  keydown: 'onKeyDown',
  keyup: 'onKeyUp',
  keycombomatch: 'onKeyCombo',

  pointerup: 'onPointerUp',
  pointermove: 'onPointerMove',
  pointerdown: 'onPointerDown',
  wheel: 'onScrollWheel',
  gameout: 'onPointerUp',

  // Custom gamepad + joystick events emitted via input polling inside `InputManager`
  'gamepad:button:down': 'onGamepadButtonDown',
  'gamepad:button:up': 'onGamepadButtonUp',
  'gamepad:joystick:left': 'onLeftJoystick',
  'gamepad:joystick:right': 'onRightJoystick',

  // Window-based events (not triggered through Phaser)
  onbeforeunload: 'onBeforeUnload',

  // // Custom events emitted
  // 'unit:pointerdown': 'onUnitDown',
  // 'unit:pointerup': 'onUnitUp',
  // 'unit:pointerover': 'onUnitOver',
  // 'unit:pointerout': 'onUnitLeave',
};

export interface IInputStrategy {
  // Special lifecycle events for input strategies. --
  onRegister?(): void;
  onUnregister?(): void;

  // Events emitted by Phaser's built-in `input` system
  onKeyDown?(event: KeyboardEvent): boolean;
  onKeyUp?(event: KeyboardEvent): boolean;
  onKeyCombo?(keyCodes: number[], text: string): boolean;
  onPointerUp?(pointer: Phaser.Input.Pointer): boolean;
  onPointerMove?(pointer: Phaser.Input.Pointer): boolean;
  onPointerDown?(pointer: Phaser.Input.Pointer): boolean;
  onScrollWheel?(
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
    dx: number,
    dy: number,
    dz: number,
    event: MouseEvent
  ): boolean;

  // Custom events emitted by one of your GameObjects
  // onUnitDown?(unit: MeleeUnitEntity, pointer: Phaser.Input.Pointer): boolean;
  // onUnitUp?(unit: MeleeUnitEntity, pointer: Phaser.Input.Pointer): boolean;
  // onUnitOver?(unit: MeleeUnitEntity, pointer: Phaser.Input.Pointer): boolean;
  // onUnitLeave?(unit: MeleeUnitEntity, pointer: Phaser.Input.Pointer): boolean;

  // Custom gamepad + joystick events emitted via custom input polling in `BaseScene`
  onGamepadButtonDown?(
    pad: Phaser.Input.Gamepad.Gamepad,
    button: Phaser.Input.Gamepad.Button,
    value: number
  ): boolean;
  onGamepadButtonUp?(
    pad: Phaser.Input.Gamepad.Gamepad,
    button: Phaser.Input.Gamepad.Button,
    value: number
  ): boolean;
  onLeftJoystick?(
    position: Phaser.Math.Vector2,
    gamepad: Phaser.Input.Gamepad.Gamepad
  ): boolean;
  onRightJoystick?(
    position: Phaser.Math.Vector2,
    gamepad: Phaser.Input.Gamepad.Gamepad
  ): boolean;

  // Window-based events (not triggered through Phaser)
  onBeforeUnload?(evt: any): boolean;
}

/**
 * List of typical button mappings to expect for gamepads
 * Use this in conjunction with `onGamepadButton[Down|Up]`
 */
export enum CommonGamepadButtons {
  DPAD_DOWN = 13,
  DPAD_LEFT = 14,
  DPAD_RIGHT = 15,
  DPAD_UP = 12,

  LEFT_BUTTON = 2,
  RIGHT_BUTTON = 1,
  UP_BUTTON = 3,
  DOWN_BUTTON = 0,

  LEFT_BUMPER = 4,
  LEFT_TRIGGER = 6,
  LEFT_JOYSTICK_BUTTON = 10,

  RIGHT_BUMPER = 5,
  RIGHT_TRIGGER = 7,
  RIGHT_JOYSTICK_BUTTON = 11,

  SELECT_BUTTON = 8,
  START_BUTTON = 9,
}

export default class InputManagerService
  implements IInputManagerService, IService
{
  private strategies: IInputStrategy[] = [];

  private cleanupCallbacks: VoidFunction[];

  constructor() {}

  initializeService(): void | Promise<void> {}
  onServicesReady(): void | Promise<void> {
    this.onInit();
  }

  private onInit = () => {
    const scene = ServiceContainer.getService(CastToSceneService).getScene();

    const listenForEvent = (eventName: PhaserInputEventType) => {
      const callback = (...args: any[]) =>
        this.onReceivedEvent(eventName, ...args);

      // if (custom) {
      // inputEventBus.on(eventName, callback);
      // } else {
      // `key` events target `input.keyboard` instead of just `input`.
      if (eventName.startsWith('key')) {
        scene.input.keyboard.on(eventName, callback);
      } else {
        scene.input.on(eventName, callback);
      }
      // }

      return () => {
        // if (custom) {
        //   inputEventBus.off(eventName, callback);
        // } else {
        scene.input.off(eventName, callback);
        // }
      };
    };

    [
      // Receive events from Phaser
      'keydown',
      'keyup',
      'keycombomatch',
      Phaser.Input.Events.GAMEOBJECT_POINTER_UP,
      Phaser.Input.Events.GAMEOBJECT_POINTER_MOVE,
      Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
      'wheel',
      // 'gameout',
    ].map(listenForEvent);

    // [
    // Receive custom input
    // 'gamepad:button:down',
    // 'gamepad:button:up',
    // 'gamepad:joystick:right',
    // 'gamepad:joystick:left',
    // 'unit:pointerout',
    // 'unit:pointerover',
    // 'unit:pointerup',
    // 'unit:pointerdown',
    // ].map(listenForEvent);

    // Window-based `onbeforeunload` event.
    window.addEventListener(
      'beforeunload',
      (evt: Event) => this.onReceivedEvent('onbeforeunload', evt),
      { capture: true }
    );

    // Disable right-clicking on the canvas entirely
    disableCanvasContextMenu();

    this.startPollingJoysticks();
  };

  private joystickPoller?: Phaser.Time.TimerEvent;
  private startPollingJoysticks() {
    const scene = ServiceContainer.getService(CastToSceneService).getScene();
    const { input, time } = scene;
    let lastLeftLength = 0;
    let lastRightLength = 0;

    let lastLeftTrigger = Infinity;
    let lastRightTrigger = Infinity;

    this.joystickPoller = time.addEvent({
      repeat: -1,
      delay: 1000 / 24,
      callback: () => {
        const leftTrigger = input.gamepad?.pad1?.buttons.find(
          (x) => x.index === CommonGamepadButtons.LEFT_TRIGGER
        );
        const rightTrigger = input.gamepad?.pad1?.buttons.find(
          (x) => x.index === CommonGamepadButtons.RIGHT_TRIGGER
        );
        if (leftTrigger && lastLeftTrigger !== leftTrigger.value) {
          if (leftTrigger.value < 1.0 && leftTrigger.value > 0.0) {
            // inputEventBus.trigger(
            //   'gamepad:button:down',
            //   input.gamepad.pad1,
            //   leftTrigger,
            //   leftTrigger.value
            // );
          }
          lastLeftTrigger = leftTrigger.value;
        }
        if (rightTrigger && lastRightTrigger !== rightTrigger.value) {
          if (rightTrigger.value < 1.0 && rightTrigger.value > 0.0) {
            // inputEventBus.trigger(
            //   'gamepad:button:down',
            //   input.gamepad.pad1,
            //   rightTrigger,
            //   rightTrigger.value
            // );
          }
          lastRightTrigger = rightTrigger.value;
        }

        const leftStick = input.gamepad?.pad1?.leftStick;
        if (leftStick && leftStick.lengthSq() !== lastLeftLength) {
          lastLeftLength = leftStick.lengthSq();
          //   inputEventBus.trigger(
          //     'gamepad:joystick:left',
          //     leftStick,
          //     input.gamepad.pad1
          //   );
        }

        const rightStick = input.gamepad?.pad1?.rightStick;
        if (rightStick && rightStick.lengthSq() !== lastRightLength) {
          lastRightLength = rightStick.lengthSq();
          //   inputEventBus.trigger(
          //     'gamepad:joystick:right',
          //     rightStick,
          //     input.gamepad.pad1
          //   );
        }
      },
    });
  }

  destroy() {
    this.joystickPoller?.destroy();
    delete this.joystickPoller;
    restoreCanvasContextMenu();
    // Remove any existing strategies
    this.strategies.forEach((x) => x.onUnregister?.());
    // Clean up various event handlers
    this.cleanupCallbacks.forEach((f) => f());
  }

  public registerStrategy = (strat: IInputStrategy) => {
    this.strategies.push(strat);
    strat.onRegister?.();
  };
  public registerMultipleStrategies = (strats: IInputStrategy[]) => {
    strats.forEach(this.registerStrategy);
  };
  public unregisterStrategy = (strat: IInputStrategy) => {
    const stratCountBefore = this.strategies.length;
    this.strategies = this.strategies.filter((x) => x !== strat);

    // Length change = strategy was removed = fire onUnregister handler
    if (stratCountBefore !== this.strategies.length) {
      strat.onUnregister?.();
    }
  };
  private onReceivedEvent = (
    eventName: PhaserInputEventType,
    ...args: any[]
  ) => {
    // Ensure that the user has this window visibile AND active before applying controls
    const hasWindowFocused =
      document.visibilityState === 'visible' && document.hasFocus();
    // Get the name of the handler to fire from the incoming event
    const handlerName = phaserInputHandlerMap[eventName];

    if (!hasWindowFocused) {
      return;
    }

    if (!handlerName) {
      console.error(
        `No appropriate input handler found for given event "${eventName}".`
      );
      return;
    }

    let idx = this.strategies.length - 1;
    let handler: undefined | ((...args: unknown[]) => boolean | void);
    while (idx >= 0) {
      handler = this.strategies[idx][handlerName];
      if (handler?.(...args)) {
        // Check if the last argument is an event that we can stopPropagation() on. By convention,
        // events should always be the last argument passed to a handler.
        const lastArg = args[args.length - 1];
        // if (typeof lastArg?.preventDefault === 'function') {
        if (lastArg instanceof Event) {
          lastArg.preventDefault();
        }
        if (typeof lastArg?.stopPropagation === 'function') {
          lastArg.stopPropagation();
        }
        return true;
      }

      idx -= 1;
    }

    return false;
  };
}

function disableCanvasContextMenu() {
  window.addEventListener('contextmenu', onCanvasContextMenu);
}
function restoreCanvasContextMenu() {
  window.removeEventListener('contextmenu', onCanvasContextMenu);
}
function onCanvasContextMenu(evt: MouseEvent) {
  if (evt.target instanceof Element && evt.target.tagName === 'CANVAS') {
    evt.preventDefault();
  }
}
