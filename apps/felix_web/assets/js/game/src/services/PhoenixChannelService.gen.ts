// This is an autogenerated file, DO NOT EDIT.
// This file was generated from `PhoenixChannelService.ts` by executing the `codegen.ts` file.
import type { IPhoenixChannelService } from "../services/PhoenixChannelService";

export function CastToPhoenixChannelService(
  obj: any,
): IPhoenixChannelService | null {
  return obj !== null && obj !== undefined && typeof obj.sendRPC === "function"
    ? obj
    : null;
}
