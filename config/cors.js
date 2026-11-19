const allowedOrigins = (process.env.CORS_ORIGINS ||
  'https://tarsha-frontend.vercel.app,https://dev.zaidexceldesign.com,https://www.zaidexceldesign.com,https://zaidexceldesign.com,http://localhost:3000,http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

module.exports = {
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};
