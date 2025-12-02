import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./schema.js";
import { hash } from "bcryptjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function main() {
  console.log("🌱 Seeding started...");

  try {
    // パスワードをハッシュ化（ソルトラウンドは10が一般的）
    const hashedPassword = await hash("adminpassword123", 10);

    await db.insert(users).values({
      username: "admin", // emailの代わりにusername
      name: "System Admin",
      password: hashedPassword, // ハッシュ化したパスワードを保存
      role: "admin",
    }).onConflictDoNothing(); // すでに存在する場合は何もしない

    console.log("✅ Admin user created successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await client.end();
  }
}

main();