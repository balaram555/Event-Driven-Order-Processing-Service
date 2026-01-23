CREATE DATABASE IF NOT EXISTS orders_db;
USE orders_db;

CREATE TABLE orders (
  order_id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(50),
  shipping_address TEXT,
  items JSON,
  status VARCHAR(20),
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
  product_id VARCHAR(50) PRIMARY KEY,
  available_stock INT
);

INSERT INTO inventory VALUES
('prod-A', 10),
('prod-B', 5),
('prod-C', 2);
