export type ArrayElement<A> = A extends (infer T)[] ? T : never;
