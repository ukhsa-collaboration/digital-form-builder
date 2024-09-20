import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export default register;
