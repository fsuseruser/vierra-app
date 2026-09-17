require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const leadRoutes = require('./routes/leads');
const bookingRoutes = require('./routes/bookings');
const reminderRoutes = require('./routes/reminders');
const goalRoutes = require('./routes/goals');
const exportRoutes = require('./routes/export');
const integrationRoutes = require('./routes/integrations');
const technicalRoutes = require('./routes/technical');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/technical', technicalRoutes);

// Serve the built React app from the same process/URL — no separate
// frontend host, no CORS setup needed in production.
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Vierra API listening on port ${PORT}`));
