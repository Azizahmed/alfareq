import { platformProxy } from "@/lib/platform-proxy";

// Every plugin's backend routes: the backend mounts each plugin under `plugins/<id>`.
export const { GET, POST, PUT, PATCH, DELETE } = platformProxy();
