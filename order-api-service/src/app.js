const express = require("express");
const { initProducer } = require("./kafka/producer");
const orders = require("./routes/orders");

const app = express();
app.use(express.json());

app.use("/api/orders", orders);

initProducer().then(() => {
  app.listen(8080, () => console.log("Order API running"));
});
