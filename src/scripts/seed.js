import bcrypt from 'bcryptjs';
import { pool, closePool } from '../shared/database.js';

const sampleUsers = [
  { fullName: 'Ahmad Fauzi', email: 'ahmad.fauzi@university.ac.id', phone: '081234567890', uid: 'A1B2C3D4' },
  { fullName: 'Siti Nurhaliza', email: 'siti.nur@university.ac.id', phone: '081234567891', uid: 'E5F6G7H8' },
  { fullName: 'Budi Santoso', email: 'budi.s@university.ac.id', phone: '081234567892', uid: 'I9J0K1L2' },
  { fullName: 'Dewi Lestari', email: 'dewi.l@university.ac.id', phone: '081234567893', uid: 'M3N4O5P6' },
  { fullName: 'Rizky Pratama', email: 'rizky.p@university.ac.id', phone: '081234567894', uid: 'Q7R8S9T0' },
];

try {
  console.info('Seeding database...');

  // Create demo admin (username: admin, password: Admin12345678)
  const hash = await bcrypt.hash('Admin12345678', 12);
  const { rows: adminRows } = await pool.query(
    "INSERT INTO admins (username, password_hash, role) VALUES ('admin', $1, 'admin') ON CONFLICT (username) DO NOTHING RETURNING id",
    [hash]
  );
  if (adminRows[0]?.id) console.info('✓ Demo admin created (username: admin, password: Admin12345678)');
  else console.info('→ Admin "admin" already exists, skipping.');

  // Get admin id
  const { rows: [existingAdmin] } = await pool.query("SELECT id FROM admins WHERE username = 'admin'");
  const aId = existingAdmin.id;

  // Insert users and cards
  for (const u of sampleUsers) {
    const { rows } = await pool.query(
      'INSERT INTO users (full_name, email, phone) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id',
      [u.fullName, u.email, u.phone]
    );
    if (rows[0]) {
      await pool.query(
        'INSERT INTO rfid_cards (user_id, uid) VALUES ($1, $2) ON CONFLICT (uid) DO NOTHING',
        [rows[0].id, u.uid]
      );
      console.info(`✓ User ${u.fullName} + card ${u.uid}`);
    } else {
      console.info(`→ User ${u.fullName} already exists, skipping.`);
    }
  }

  // Get all user+card pairs for access logs
  const { rows: userCards } = await pool.query(
    `SELECT u.id AS user_id, u.full_name, c.id AS card_id, c.uid
     FROM users u JOIN rfid_cards c ON c.user_id = u.id`
  );

  if (userCards.length > 0) {
    const directions = ['entry', 'exit'];
    const results = ['granted', 'granted', 'granted', 'granted', 'denied'];
    const reasons = [null, null, null, 'Kartu tidak terdaftar', 'Akses di luar jadwal'];

    for (let i = 0; i < 30; i++) {
      const uc = userCards[Math.floor(Math.random() * userCards.length)];
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const res = results[Math.floor(Math.random() * results.length)];
      const reason = res === 'denied' ? reasons[3 + Math.floor(Math.random() * 2)] : null;
      const hoursAgo = Math.floor(Math.random() * 72);

      await pool.query(
        `INSERT INTO access_logs (user_id, card_id, uid_snapshot, user_name_snapshot, direction, result, reason, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '1 hour' * $8)`,
        [uc.user_id, uc.card_id, uc.uid, uc.full_name, dir, res, reason, hoursAgo]
      );
    }
    console.info('✓ 30 sample access log entries created');
  }

  console.info('Seeding complete!');
} catch (error) {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
