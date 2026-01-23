const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../db");
const { publishEvent } = require("../kafka/producer");
const validate = require("../validators/orderValidator");

const router = express.Router();

router.post("/", validate, async (req, res) => {
  const { customer_id, shipping_address, items } = req.body;
  const orderId = uuid();

  await db.query(
    "INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, NOW())",
    [orderId, customer_id, shipping_address, JSON.stringify(items), "PENDING", null]
  );

  await publishEvent({
    event_type: "OrderCreated",
    order_id: orderId,
    customer_id,
    items,
    status: "PENDING",
    timestamp: new Date().toISOString()
  });

  res.status(202).json({ order_id: orderId, status: "PENDING" });
});

module.exports = router;
