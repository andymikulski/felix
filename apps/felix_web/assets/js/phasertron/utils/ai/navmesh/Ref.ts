/**
 * This is a basic type that is used to indicate that a value is a reference to another object.
 * If you see this, it likely means that the object should be modified in place, rather than replaced.
 *
 * The intention here is to mimic the `ref` keyword in C#.
 */
export type Ref<T> = T;
