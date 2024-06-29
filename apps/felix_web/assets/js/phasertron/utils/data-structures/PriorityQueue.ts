import DoublyLinkedList, { LinkedListNode } from './DoublyLinkedList';

type PriorityQueueNode<T> = {
  data: T;
  priority: number;
};

export default class PriorityQueue<T> {
  private list = new DoublyLinkedList<PriorityQueueNode<T>>();

  public push = (value: T, priority: number): void => {
    const node: PriorityQueueNode<T> = {
      data: value,
      priority,
    };

    if (this.list.count === 0) {
      this.list.insertFirst(node);
      return;
    }

    let current = this.list.head;
    let i = -1;
    while (current) {
      i++;
      if (current.data.priority > priority) {
        this.list.insertAt(node, i);
        return;
      }
      current = current.next;
    }

    this.list.insertLast(node);
  };

  public pop = (): T | undefined => {
    const node = this.list.removeFirst();
    if (!node) {
      throw new Error();
    }
    return node ? node.data : undefined;
  };

  public peek = (): T | undefined => {
    return this.list.head?.data.data;
  };

  public isEmpty = (): boolean => {
    return this.list.count === 0;
  };
}
