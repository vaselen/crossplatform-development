// Ручное создание расписания: каждый фильм, семь дней, пять фиксированных времён.
import PocketBase from 'pocketbase';
async function main() {
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Задайте PB_ADMIN_EMAIL и PB_ADMIN_PASSWORD в .env.local (см. README).');
  const pb = new PocketBase('http://127.0.0.1:8093');
  await pb.collection('_superusers').authWithPassword(email, password);
  const result = await pb.send('/api/cinema/admin/schedule', { method: 'POST', body: {} });
  console.log(`Создано сеансов: ${result.created}. Сеансы с купленными билетами сохранены.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
