export class ProviderPool<T> {
  private readonly providers: T[];
  private index = 0;

  constructor(providers: T[]) {
    if (!providers.length) {
      throw new Error('ProviderPool requires at least one provider');
    }
    this.providers = providers;
  }

  next(): T {
    const provider = this.providers[this.index % this.providers.length]!;
    this.index = (this.index + 1) % this.providers.length;
    return provider;
  }

  size(): number {
    return this.providers.length;
  }
}
