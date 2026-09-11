import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required(
    "ee8b863c17edaade867b13e789a31715434b016cea713949346b2e204521acb8715dca040522d36404495d7eaf195698",
  ),
  jwtRefreshSecret: required(
    "bf84de32cd6ca0a788c93a297fa0b8840f681e955b526a403f713a89e0188cc187eb4c73a9d74d9e0cb75397256e0dbb",
  ),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
};
