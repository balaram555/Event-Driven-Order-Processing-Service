const { Kafka } = require("kafkajs");
const db = require("../db");

const kafka = new Kafka({
  clientId: "order-processor",
  brokers: ["kafka:9092"]
});

const consumer = kafka.consumer({ groupId: "order-group" });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: "order-events" });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());

      if (event.event_type !== "OrderCreated") return;

      // Idempotency check
      const [rows] = await db.query(
        "SELECT status FROM orders WHERE order_id=?",
        [event.order_id]
      );
      if (rows[0].status !== "PENDING") return;

      try {
        for (const item of event.items) {
          const [res] = await db.query(
            "UPDATE inventory SET available_stock = available_stock - ? WHERE product_id=? AND available_stock >= ?",
            [item.quantity, item.product_id, item.quantity]
          );
          if (res.affectedRows === 0) throw new Error("Out of stock");
        }

        await db.query(
          "UPDATE orders SET status='VALIDATED' WHERE order_id=?",
          [event.order_id]
        );
      } catch (err) {
        await db.query(
          "UPDATE orders SET status='FAILED', failure_reason=? WHERE order_id=?",
          [err.message, event.order_id]
        );
      }
    }
  });
}

module.exports = startConsumer;
