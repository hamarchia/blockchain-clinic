import { create } from "ipfs-http-client";

// 🔹 Replace with your actual QuickNode IPFS URL
const QUICKNODE_IPFS_URL = "https://api.quicknode.com/ipfs/rest/QN_a5732b3578894aa6a372940a41109046/";

const client = create({
  url: QUICKNODE_IPFS_URL, // QuickNode's IPFS API URL
});

export default client;