export class Node<T> {
  public data: T;
  public next: Node<T> | null = null;
  public prev: Node<T> | null = null;

  public getValue() {
    return this.data;
  }

  constructor(data: T) {
    this.data = data;
  }
}

export default class DoublyLinkedList<T> {
  private headNode: Node<T> | null = null;
  private tailNode: Node<T> | null = null;
  private nodeCount: number = 0;

  public count(): number {
    return this.nodeCount;
  }

  public head() {
    return this.headNode;
  }
  public tail() {
    return this.tailNode;
  }

  public insertFirst(data: T): void {
    const newNode = new Node(data);
    if (this.headNode === null) {
      this.headNode = newNode;
      this.tailNode = newNode;
    } else {
      newNode.next = this.headNode;
      this.headNode.prev = newNode;
      this.headNode = newNode;
    }
    this.nodeCount++;
  }

  public removeLast(): T | null {
    if (this.tailNode === null) {
      return null;
    }

    const data = this.tailNode.data;
    if (this.tailNode.prev !== null) {
      this.tailNode = this.tailNode.prev;
      this.tailNode.next = null;
    } else {
      this.headNode = null;
      this.tailNode = null;
    }
    this.nodeCount--;
    return data;
  }
}
