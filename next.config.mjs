import { fileURLToPath } from "url";
import { dirname } from "path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["unpdf", "jsdom", "mammoth"],
  // Pin the workspace root so stray parent lockfiles don't confuse resolution.
  turbopack: { root: projectRoot },
};

export default nextConfig;
