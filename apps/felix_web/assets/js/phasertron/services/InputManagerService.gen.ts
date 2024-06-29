// This is an autogenerated file, DO NOT EDIT.
// This file was generated from `InputManagerService.ts` by executing the `codegen.ts` file.
import type {
  IInputManagerService,
  IInputStrategy,
} from '../services/InputManagerService';

export function CastToInputManagerService(
  obj: any
): IInputManagerService | null {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.registerStrategy === 'function' &&
    typeof obj.registerMultipleStrategies === 'function' &&
    typeof obj.unregisterStrategy === 'function'
    ? obj
    : null;
}

export function CastToInputStrategy(obj: any): IInputStrategy | null {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.onRegister === 'function' &&
    typeof obj.onUnregister === 'function' &&
    typeof obj.onKeyDown === 'function' &&
    typeof obj.onKeyUp === 'function' &&
    typeof obj.onKeyCombo === 'function' &&
    typeof obj.onPointerUp === 'function' &&
    typeof obj.onPointerMove === 'function' &&
    typeof obj.onPointerDown === 'function' &&
    typeof obj.onScrollWheel === 'function' &&
    typeof obj.onGamepadButtonDown === 'function' &&
    typeof obj.onGamepadButtonUp === 'function' &&
    typeof obj.onLeftJoystick === 'function' &&
    typeof obj.onRightJoystick === 'function' &&
    typeof obj.onBeforeUnload === 'function'
    ? obj
    : null;
}
