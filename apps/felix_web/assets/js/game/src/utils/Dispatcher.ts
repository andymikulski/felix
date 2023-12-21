export interface IDispatcher<T> {
  subscribe(event: T, callback: Function): void;
  unsubscribe(event: T, callback: Function): void;
  dispatch(event: T, args?: any): void;
}

export class Dispatcher<T> implements IDispatcher<T> {
  private listeners: Map<T, Function[]> = new Map();

  subscribe(event: T, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  unsubscribe(event: T, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  dispatch(event: T, args?: any): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    callbacks.forEach((callback) => {
      callback(args);
    });
  }
}
