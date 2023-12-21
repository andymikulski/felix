import { IService } from "./ServiceContainer";
import Phaser from "phaser";
import { Channel, Socket } from "phoenix";

export interface IPhoenixChannelService {
  sendRPC<T>(rpc: string, data: any): Promise<T>;
  subscribe(event: string, callback: (data: any) => void): void;
}

const decoder = new TextDecoder("utf-8");

export class PhoenixChannelService implements IService, IPhoenixChannelService {
  game: Phaser.Game;
  private socket: Socket;
  private channel: Channel;

  public initializeService = async (): Promise<void> => {
    await this.setupChannel();
  };

  private setupChannel = () => {
    return new Promise<Socket>((res, rej) => {
      // And connect to the path in "lib/felix_web/endpoint.ex". We pass the
      // token for authentication. Read below how it should be used.
      let socket = new Socket("/socket", {
        params: { token: (window as any).userToken },
      });
      socket.connect();
      this.socket = socket;

      // Now that you are connected, you can join channels with a topic.
      // Let's assume you have a channel with a topic named `room` and the
      // subtopic is its id - in this case 42:
      let channel = socket.channel("room:42", {});
      this.channel = channel;

      channel
        .join()
        .receive("ok", (resp: unknown) => {
          console.log("Joined successfully", resp);
          this.tryPing();
          res(socket);
        })
        .receive("error", (resp: unknown) => {
          console.log("Unable to join", resp);
          rej("Unable to join room!");
        });

      console.log("channel", channel);
    });
  };

  private tryPing = async () => {
    const res = await this.sendRPC<{ data: number }>("ping", {
      data: Date.now(),
    });
    const now = Date.now();
    console.log("Ping was ", now - res.data, "ms");
  };

  public subscribe = (event: string, callback: (data: any) => void) => {
    const id = this.channel.on(event, (res) => {
      if (res instanceof ArrayBuffer) {
        // convert arraybuffer to text
        res = decoder.decode(res);
      }
      console.log('Received event', event, res);
      callback(res);
    });
    return () => {
      this.channel.off(event, id);
    }
  }

  public sendRPC = <T,>(rpc: string, data: any) => {
    return new Promise<T>((res, rej) => {
      this.channel
        .push(rpc, data)
        .receive("ok", (resp: T) => {
          console.log("RPC success", resp);
          res(resp);
        })
        .receive("error", (resp: T) => {
          console.log("RPC error", resp);
          rej(resp);
        });
    });
  };

  public onServicesReady(): void { }
}