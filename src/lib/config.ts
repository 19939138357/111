export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'library-jwt-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: '0.0.0.0',
  },
  loan: {
    defaultLoanDays: 14,
    maxRenewCount: 2,
    finePerDay: 1.0,
  },
};
