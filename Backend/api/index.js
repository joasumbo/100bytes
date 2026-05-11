// Vercel serverless function entry point.
// Carrega o handler NestJS pré-compilado (dist/lambda.js).
const lambda = require('../dist/lambda');
const handler = lambda.handler ?? lambda.default ?? lambda;

module.exports = async (req, res) => {
  await handler(req, res);
};
