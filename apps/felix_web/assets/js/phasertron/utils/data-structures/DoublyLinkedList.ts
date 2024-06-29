export type LinkedListNode<T> = {
  data: T;
  next: LinkedListNode<T> | null;
  prev: LinkedListNode<T> | null;
};

export default class DoublyLinkedList<T> {
  private headNode: LinkedListNode<T> | null = null;
  private tailNode: LinkedListNode<T> | null = null;
  private nodeCount: number = 0;

  public get count(): number {
    return this.nodeCount;
  }

  public get head() {
    return this.headNode;
  }
  public get tail() {
    return this.tailNode;
  }

  public insertFirst(data: T): void {
    const newNode: LinkedListNode<T> = { data, next: null, prev: null };
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

  public insertLast(data: T): void {
    const newNode: LinkedListNode<T> = { data, next: null, prev: null };
    if (this.tailNode === null) {
      this.headNode = newNode;
      this.tailNode = newNode;
    } else {
      newNode.prev = this.tailNode;
      this.tailNode.next = newNode;
      this.tailNode = newNode;
    }
    this.nodeCount++;
  }

  public insertAt(data: T, index: number): void {
    if (index < 0 || index > this.nodeCount) {
      throw new Error('Index out of bounds');
    }

    if (index === 0) {
      this.insertFirst(data);
      return;
    }

    if (index === this.nodeCount) {
      this.insertLast(data);
      return;
    }

    const newNode: LinkedListNode<T> = { data, next: null, prev: null };
    let currentNode = this.headNode;
    let currentIndex = 0;
    while (currentNode !== null) {
      if (currentIndex === index) {
        newNode.next = currentNode;
        newNode.prev = currentNode.prev;
        currentNode.prev!.next = newNode;
        currentNode.prev = newNode;
        this.nodeCount++;
        return;
      }
      currentNode = currentNode.next;
      currentIndex++;
    }
  }

  public removeAt(index: number): T | null {
    if (index < 0 || index > this.nodeCount) {
      throw new Error('Index out of bounds');
    }

    if (index === 0) {
      return this.removeFirst();
    }

    if (index === this.nodeCount - 1) {
      return this.removeLast();
    }

    let currentNode = this.headNode;
    let currentIndex = 0;
    while (currentNode !== null) {
      if (currentIndex === index) {
        currentNode.prev!.next = currentNode.next;
        currentNode.next!.prev = currentNode.prev;
        this.nodeCount--;
        return currentNode.data;
      }
      currentNode = currentNode.next;
      currentIndex++;
    }
    return null;
  }

  public removeFirst(): T | null {
    if (this.headNode === null) {
      return null;
    }

    const data = this.headNode.data;
    if (this.headNode.next !== null) {
      this.headNode = this.headNode.next;
      this.headNode.prev = null;
    } else {
      this.headNode = null;
      this.tailNode = null;
    }
    this.nodeCount--;
    return data;
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

  [Symbol.iterator] = () => {
    let currentNode = this.headNode;
    return {
      next: () => {
        if (currentNode === null) {
          return { done: true, value: null };
        }
        const data = currentNode.data;
        currentNode = currentNode.next;
        return { done: false, value: data };
      },
    };
  };
}
