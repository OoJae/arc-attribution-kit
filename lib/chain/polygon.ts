// Polygon Amoy viem client. Only used by the optional CCTP sweep route.

import { createPublicClient, http } from "viem";
import { polygonAmoy } from "viem/chains";

export { polygonAmoy };

export function getPolygonPublicClient() {
  return createPublicClient({
    chain: polygonAmoy,
    transport: http(process.env.POLYGON_RPC_URL),
  });
}
