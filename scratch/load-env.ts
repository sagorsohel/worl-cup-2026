import dotenv from "dotenv"
import fs from "fs"
import path from "path"

const localEnv = path.resolve(process.cwd(), ".env.local")
const defaultEnv = path.resolve(process.cwd(), ".env")

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv })
} else {
  dotenv.config({ path: defaultEnv })
}
