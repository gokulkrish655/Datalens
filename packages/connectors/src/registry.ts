import { IDbConnector } from './interface';

class ConnectorRegistry {
  private readonly map = new Map<string, IDbConnector>();

  register(connector: IDbConnector): void {
    this.map.set(connector.name, connector);
  }

  get(name: string): IDbConnector {
    const connector = this.map.get(name);
    if (!connector) {
      throw new Error(`Connector not found: ${name}`);
    }
    return connector;
  }

  list(): IDbConnector[] {
    return Array.from(this.map.values());
  }
}

export const registry = new ConnectorRegistry();
