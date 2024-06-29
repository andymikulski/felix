export interface IService {
  initializeService(): void | Promise<void>;
  onServicesReady(): void | Promise<void>;
}

export interface IServiceContainer {
  register(service: IService): void;
  getService<T>(castFn: (service: IService) => T | null): T;
  tryGetService<T>(castFn: (service: IService) => T | null): T | null;
}

class ServiceContainer {
  private registeredServices: Set<IService> = new Set<IService>();

  private initialized = false;
  private ready = false;

  public initialize = async (services: IService[]) => {
    for (const svc of services) {
      this.registeredServices.add(svc);
    }

    this.initialized = true;
    // Initialize all services and register them internally
    for (const service of services) {
      this.registeredServices.add(service);
      await service.initializeService();
    }

    // Tell them all that they're ready and can now safely cross-reference each other
    for (const service of this.registeredServices) {
      await service.onServicesReady();
    }
    this.ready = true;
  };

  public register = async (service: IService) => {
    this.registeredServices.add(service);
    if (this.initialized) {
      await service.initializeService();
    }
    if (this.ready) {
      await service.onServicesReady();
    }
  };

  /**
   * Finds a service, throwing an error if not found.
   *
   * Usage:
   * ```
   * // Here, `castToSomeService` is a generated function which finds the service matching the
   * // cast. This is extremely useful for mocks and testing.
   * const service = serviceContainer.getService(castToSomeService);
   * service.doSomething();
   * ```
   */
  public getService<T>(castFn: (service: IService) => T | null): T {
    const found = this.tryGetService(castFn);
    if (found) {
      return found;
    }
    throw new Error(`Service not found when searching with "${castFn.name}"`);
  }

  /**
   * Finds a service, returning `null` if not found.
   *
   * Usage:
   * ```
   * // Here, `castToSomeService` is a generated function which finds the service which matches the
   * // cast. This is extremely useful for mocks and testing.
   * const service = serviceContainer.tryGetService(castToSomeService);
   * if (service){ service.doSomething(); }
   * ```
   */
  public tryGetService<T>(castFn: (service: IService) => T | null) {
    for (const registered of Array.from(this.registeredServices)) {
      var found = castFn(registered);
      if (found) {
        return found;
      }
    }
    return null;
  }
}

export default new ServiceContainer();
