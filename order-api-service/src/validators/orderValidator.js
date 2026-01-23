module.exports = (req, res, next) => {
  const { customer_id, shipping_address, items } = req.body;

  if (!customer_id || !shipping_address || !Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  for (const item of items) {
    if (!item.product_id || item.quantity <= 0) {
      return res.status(400).json({ error: "Invalid item" });
    }
  }
  next();
};
