import { IDbConnector } from './interface';

class ConnectorRegistry {
  private readonly map = new Map<string, IDbConnector>();

  register(connector: IDbConnector): void {
    this.map.set(connector.name, connector);
  }

  get(name: string): IDbConnector {
    const connector = this.map.get(name);
    if (!connector) {
      throw new Error(
        `No connector registered for "${name}". Available: ${[...this.map.keys()].join(', ')}.`,
      );
    }
    return connector;
  }

  list(): Array<{ name: string; displayName: string }> {
    return Array.from(this.map.values()).map((connector) => ({
      name: connector.name,
      displayName: connector.displayName,
    }));
  }
}

export const registry = new ConnectorRegistry();
