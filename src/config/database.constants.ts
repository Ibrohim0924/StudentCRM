import { ColumnType } from 'typeorm';

type SupportedDb = 'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'better-sqlite3';

const determineDbType = (): SupportedDb => {
  const raw = (process.env.DB_TYPE ?? 'postgres').toLowerCase();
  if (['mysql', 'mariadb', 'sqlite', 'better-sqlite3', 'postgres'].includes(raw)) {
    return raw as SupportedDb;
  }
  return 'postgres';
};

export const dateColumnType: ColumnType = (() => {
  const dbType = determineDbType();
  if (dbType === 'postgres') {
    return 'timestamptz';
  }
  return 'datetime';
})();