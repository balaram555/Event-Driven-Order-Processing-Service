const { Kafka } = require("kafkajs");
const db = require("../db");

const kafka = new Kafka({
  clientId: "order-processor",
  brokers: ["kafka:9092"]
});

const consumer = kafka.consumer({ groupId: "order-group" });
const producer = kafka.producer();

async function startConsumer() {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({ topic: "order-events" });

  await consumer.run({
    eachMessage: async ({ message }) => {

      let event;

      try {
        event = JSON.parse(message.value.toString());
      } catch (err) {
        console.error("Invalid Kafka message:", err.message);
        return;
      }

      if (event.event_type !== "OrderCreated") return;

      console.log(`Processing order ${event.order_id}`);

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        // Idempotency check
        const [rows] = await connection.query(
          "SELECT status FROM orders WHERE order_id=?",
          [event.order_id]
        );

        if (!rows.length || rows[0].status !== "PENDING") {
          await connection.rollback();
          return;
        }

        for (const item of event.items) {
          const [res] = await connection.query(
            "UPDATE inventory SET available_stock = available_stock - ? WHERE product_id=? AND available_stock >= ?",
            [item.quantity, item.product_id, item.quantity]
          );

          if (res.affectedRows === 0) {
            throw new Error("Insufficient Stock");
          }
        }

        await connection.query(
          "UPDATE orders SET status='VALIDATED' WHERE order_id=?",
          [event.order_id]
        );

        await connection.commit();

        // Publish success event
        await producer.send({
          topic: "order-events",
          messages: [
            {
              value: JSON.stringify({
                event_type: "OrderValidated",
                order_id: event.order_id,
                customer_id: event.customer_id,
                items: event.items,
                status: "VALIDATED",
                timestamp: new Date().toISOString()
              })
            }
          ]
        });

        console.log(`Order ${event.order_id} validated`);

      } catch (err) {

        await connection.rollback();

        await connection.query(
          "UPDATE orders SET status='FAILED', failure_reason=? WHERE order_id=?",
          [err.message, event.order_id]
        );

        // Publish failure event
        await producer.send({
          topic: "order-events",
          messages: [
            {
              value: JSON.stringify({
                event_type: "OrderFailed",
                order_id: event.order_id,
                status: "FAILED",
                failure_reason: err.message,
                timestamp: new Date().toISOString()
              })
            }
          ]
        });

        console.error(`Order ${event.order_id} failed:`, err.message);

      } finally {
        connection.release();
      }

    }
  });
}

module.exports = startConsumer;