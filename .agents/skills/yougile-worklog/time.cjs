// Local stopwatch and outbox. Only the agent's MCP client sends messages.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const dir = process.env.YOUGILE_WORKLOG_DIR || path.join(os.homedir(), '.yougile-worklog');
const file = path.join(dir, 'state.json');
const lock = path.join(dir, 'state.lock');

function check(ok, message) {
  if (!ok) throw new Error(message);
}

function day(ms) {
  const t = new Date(ms);
  return [t.getFullYear(), t.getMonth() + 1, t.getDate()]
    .map(n => String(n).padStart(2, '0')).join('-');
}

function draft(task, code, date, minutes) {
  const id = randomUUID();
  return { id, task, code, date, minutes, sending: false,
    text: `Учёт времени · ${date} · ${minutes} мин. [time:${id}]` };
}

function read() {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : { timer: null, pending: null, last: null };
}

function elapsed(t, now) {
  check(t, 'Нет таймера');
  check(t.since === null || now >= t.since, 'Системное время изменилось');
  return t.ms + (t.since === null ? 0 : now - t.since);
}

function update(s, [cmd, a, b, c, d], now) {
  const { timer: t, pending: p } = s;
  switch (cmd) {
    case 'start':
    case 'manual': {
      check(!p, 'Сначала разберите ожидающую запись');
      check(/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(a) && b, 'Нужны UUID и ID карточки');
      if (cmd === 'start') {
        check(!t, 'Уже есть таймер');
        s.timer = { task: a, code: b, date: day(now), ms: 0, since: now };
      } else {
        const date = d ?? day(now);
        check(Number.isSafeInteger(+c) && +c > 0 && +c <= 1440, 'Нужно от 1 до 1440 минут за дату');
        check(/^\d{4}-\d{2}-\d{2}$/.test(date) && day(Date.parse(`${date}T12:00:00`)) === date, 'Некорректная дата');
        s.pending = draft(a, b, date, +c);
      }
      break;
    }
    case 'pause':
      check(t && t.since !== null, 'Нет запущенного таймера');
      t.ms = elapsed(t, now); t.since = null;
      break;
    case 'resume':
      check(t && t.since === null, 'Нет приостановленного таймера');
      t.since = now;
      break;
    case 'stop': {
      check(!p, 'Сначала разберите ожидающую запись');
      const minutes = Math.round(elapsed(t, now) / 60000);
      check(minutes > 0, 'Интервал меньше половины минуты');
      s.pending = draft(t.task, t.code, t.date, minutes);
      s.timer = null;
      break;
    }
    case 'cancel-timer':
      check(t, 'Нет таймера');
      s.timer = null;
      break;
    case 'claim':
    case 'ack':
    case 'reset-send':
    case 'discard':
      check(p && p.id === a, 'Не совпадает ID ожидающей записи');
      if (cmd === 'claim') {
        check(!p.sending, 'Отправка уже начата');
        p.sending = true;
      } else if (cmd === 'ack') {
        check(b, 'Нужен ID сообщения');
        s.last = { ...p, sending: false, messageId: b }; s.pending = null;
      } else if (cmd === 'reset-send') {
        p.sending = false;
      } else {
        check(!p.sending, 'Сначала проверьте доставку');
        s.pending = null;
      }
      break;
    default: throw new Error('Неизвестная команда; см. SKILL.md');
  }
}

function run(args) {
  if (!args.length || args[0] === 'status') {
    const s = read();
    return { ...s, elapsedMinutes: s.timer ? Math.round(elapsed(s.timer, Date.now()) / 60000) : null };
  }
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const fd = fs.openSync(lock, 'wx', 0o600);
  const tmp = `${file}.${randomUUID()}.tmp`;
  try {
    const s = read();
    update(s, args, Date.now());
    fs.writeFileSync(tmp, JSON.stringify(s), { mode: 0o600 });
    fs.renameSync(tmp, file);
    return s;
  } finally {
    fs.closeSync(fd);
    try { fs.rmSync(tmp, { force: true }); } finally { fs.unlinkSync(lock); }
  }
}

try {
  console.log(JSON.stringify(run(process.argv.slice(2))));
} catch (err) {
  console.error(err.code === 'EEXIST' ? 'Хранилище занято другой операцией (state.lock)' : err.message);
  process.exitCode = 1;
}
