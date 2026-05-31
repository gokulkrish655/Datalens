import { registry } from './registry';
import { postgresConnector } from './built-in/postgres';
import { mysqlConnector } from './built-in/mysql';
import { mariadbConnector } from './built-in/mariadb';
import { mssqlConnector } from './built-in/mssql';
import { oracleConnector } from './built-in/oracle';
import { snowflakeConnector } from './built-in/snowflake';
import { bigqueryConnector } from './built-in/bigquery';
import { redshiftConnector } from './built-in/redshift';

registry.register(postgresConnector);
registry.register(mysqlConnector);
registry.register(mariadbConnector);
registry.register(mssqlConnector);
registry.register(oracleConnector);
registry.register(snowflakeConnector);
registry.register(bigqueryConnector);
registry.register(redshiftConnector);

export { registry };
export { refreshConnectionMetadata } from './manager';
export type { RefreshOptions } from './manager';
