const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../db");
const { publishEvent } = require("../kafka/producer");
const validate = require("../validators/orderValidator");

const router = express.Router();


// CREATE ORDER
router.post("/", validate, async (req, res) => {
  const { customer_id, shipping_address, items } = req.body;
  const orderId = uuid();

  try {

    await db.query(
      "INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [
        orderId,
        customer_id,
        shipping_address,
        JSON.stringify(items),
        "PENDING",
        null
      ]
    );

    await publishEvent({
      event_type: "OrderCreated",
      order_id: orderId,
      customer_id,
      items,
      status: "PENDING",
      timestamp: new Date().toISOString()
    });

    res.status(202).json({
      order_id: orderId,
      status: "PENDING"
    });

  } catch (error) {

    console.error("Error creating order:", error);

    res.status(500).json({
      error: "Failed to create order"
    });

  }
});


// GET ORDER STATUS
router.get("/:orderId", async (req, res) => {

  const { orderId } = req.params;

  try {

    const [rows] = await db.query(
      "SELECT * FROM orders WHERE order_id=?",
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.status(200).json(rows[0]);

  } catch (error) {

    console.error("Error fetching order:", error);

    res.status(500).json({
      error: "Internal server error"
    });

  }

});


module.exports = router;