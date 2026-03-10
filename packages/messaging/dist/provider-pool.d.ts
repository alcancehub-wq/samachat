export declare class ProviderPool<T> {
    private readonly providers;
    private index;
    constructor(providers: T[]);
    next(): T;
    size(): number;
}
//# sourceMappingURL=provider-pool.d.ts.map