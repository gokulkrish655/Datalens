import { NextResponse } from 'next/server';
import { createAdminPrisma } from '@datalens/db';
import { registry } from '@datalens/connectors';
import { decrypt } from '@datalens/providers/src/crypto';
import { requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(['DB_ADMIN']);
  if (auth.response) return auth.response;
  const { id } = await params;
  const db = createAdminPrisma();

  const connection = await db.databaseConnection.findFirst({
    where: { id, tenantId: auth.session!.user.tenantId },
  });
  if (!connection) {
    return NextResponse.json({ ok: false, error: 'Connection not found' }, { status: 404 });
  }
  if (!connection.disclosureAcknowledgedAt) {
    return NextResponse.json({ ok: false, error: 'Disclosure must be acknowledged before crawl' }, { status: 400 });
  }

  await db.databaseConnection.update({
    where: { id: connection.id },
    data: { status: 'SYNCING' },
  });

  try {
    const secretRaw = await decrypt(connection.encryptedCredentials);
    const secret = JSON.parse(secretRaw) as {
      username?: string;
      user?: string;
      password: string;
      database?: string;
      schema?: string;
      extra?: Record<string, string>;
    };
    const connector = registry.get(connection.connectorName);
    const config = {
      host: connection.host,
      port: connection.port ?? undefined,
      database: connection.database ?? secret.database,
      schema: connection.schema ?? secret.schema,
      username: secret.username ?? secret.user,
      password: secret.password,
      ssl: true,
      extra: secret.extra,
    };

    const [version, tables, columns] = await Promise.all([
      connector.detectVersion(config),
      connector.introspectTables(config),
      connector.introspectColumns(config),
    ]);

    await db.$transaction(async (tx) => {
      await tx.schemaColumn.deleteMany({
        where: {
          table: {
            connectionId: connection.id,
            tenantId: auth.session!.user.tenantId,
          },
        },
      });
      await tx.schemaTable.deleteMany({
        where: { connectionId: connection.id, tenantId: auth.session!.user.tenantId },
      });

      const created = new Map<string, string>();
      for (const table of tables) {
        const row = await tx.schemaTable.create({
          data: {
            tenantId: auth.session!.user.tenantId,
            connectionId: connection.id,
            tableName: table.tableName,
            displayName: table.displayName ?? table.tableName,
            description: table.nativeComment ?? table.description ?? null,
            descriptionSource: table.nativeComment ? 'HUMAN_WRITTEN' : 'AI_GENERATED',
            descriptionApproved: Boolean(table.nativeComment),
            rowCountEstimate: table.rowCountEstimate ?? undefined,
            visibility: 'RESTRICTED',
          },
        });
        created.set(`${table.schemaName ?? ''}.${table.tableName}`, row.id);
      }

      for (const column of columns) {
        const key = `${column.schemaName ?? ''}.${column.tableName}`;
        const tableId = created.get(key);
        if (!tableId) continue;
        await tx.schemaColumn.create({
          data: {
            tenantId: auth.session!.user.tenantId,
            tableId,
            columnName: column.columnName,
            displayName: column.displayName ?? column.columnName,
            dataType: column.dataType,
            semanticType: 'UNKNOWN',
            description: column.nativeComment ?? column.description ?? null,
            descriptionSource: column.nativeComment ? 'HUMAN_WRITTEN' : 'AI_GENERATED',
          },
        });
      }

      await tx.databaseConnection.update({
        where: { id: connection.id },
        data: {
          status: 'CONNECTED',
          updatedAt: new Date(),
          database: config.database,
          schema: config.schema,
          queryTimeoutSeconds: Math.max(30, connection.queryTimeoutSeconds),
        },
      });
    });

    return NextResponse.json({
      ok: true,
      message: 'Crawl completed',
      version: version.versionString,
      tableCount: tables.length,
      columnCount: columns.length,
    });
  } catch (error) {
    await db.databaseConnection.update({
      where: { id: connection.id },
      data: { status: 'ERROR' },
    });
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
