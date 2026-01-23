const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "order-api",
  brokers: ["kafka:9092"]
});

const producer = kafka.producer();

async function initProducer() {
  await producer.connect();
}

async function publishEvent(event) {
  await producer.send({
    topic: "order-events",
    messages: [
      { key: event.order_id, value: JSON.stringify(event) }
    ]
  });
}

module.exports = { initProducer, publishEvent };
