// backend/src/db/schema.ts
import { pgTable, serial, text, integer, pgEnum } from "drizzle-orm/pg-core";

// ロールのEnumを定義
export const userRoleEnum = pgEnum("user_role", ["admin", "general"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // email を削除し username を追加
  username: text("username").notNull().unique(),
  name: text("name").notNull(), // 表示名として残す（あるいは username と統合してもよいが、今回は残す）
  password: text("password").notNull(),
  // ロールカラムを追加（デフォルトは一般ユーザー）
  role: userRoleEnum("role").default("general").notNull(),
});