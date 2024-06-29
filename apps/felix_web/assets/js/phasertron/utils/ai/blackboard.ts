export interface IBlackboardObject {}

export interface IBlackboard {
  set: (key: string, value: any) => void;
  get: <T>(key: string, fallback?: T) => T | null;
  tagObject: (tags: string[], gameObject: IBlackboardObject) => void;
  removeObjectTags: (tags: string[], gameObject: IBlackboardObject) => void;
  getTagged: (tag: string) => IBlackboardObject[];
}

export default class Blackboard implements IBlackboard {
  private data: { [key: string]: any } = {};
  public set = (key: string, value: any) => {
    this.data[key] = value;
  };
  public get = <T>(key: string, fallback?: T): T | null => {
    return (this.data[key] as T) ?? fallback ?? null;
  };

  private taggedObjects: { [tag: string]: IBlackboardObject[] } = {};

  public tagObject = (tags: string[], gameObject: IBlackboardObject) => {
    let tag;
    for (let i = 0; i < tags.length; i++) {
      tag = tags[i];
      this.taggedObjects[tag] = this.taggedObjects[tag] || [];
      this.taggedObjects[tag].push(gameObject);
    }
  };

  public removeObjectTags = (tags: string[], gameObject: IBlackboardObject) => {
    let tag;
    for (let i = 0; i < tags.length; i++) {
      tag = tags[i];
      if (!this.taggedObjects[tag]) {
        continue;
      }
      this.taggedObjects[tag] = this.taggedObjects[tag].filter(
        (x) => x !== gameObject
      );
    }
  };

  public getTagged = (tag: string): IBlackboardObject[] => {
    return this.taggedObjects[tag] || [];
  };
}
