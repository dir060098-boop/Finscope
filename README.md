# FinScope — финансовый анализ для учредителей

Веб-приложение для анализа баланса, ОПУ и кэш-флоу с AI-интерпретацией через Claude.

## Стек

| Слой | Технология |
|------|-----------|
| Бэкенд | Python 3.12 + FastAPI |
| Фронтенд | React 18 + Vite + Chart.js |
| База данных | PostgreSQL 16 |
| AI | Anthropic Claude API |
| Деплой | Railway + GitHub |
| Контейнеры | Docker + Docker Compose |

## Возможности

- **Пульс** — светофор, рейтинг X/5, ключевые риски
- **ОПУ** — водопад прибыли, структура затрат, сравнение периодов
- **Баланс** — структура активов и пассивов
- **Коэффициенты** — ликвидность, устойчивость, оборачиваемость, радар, Дюпон
- **Кэш-флоу** — операционный/инвестиционный/финансовый + FCF
- **Динамика** — тренды до 12 периодов
- **Сценарии** — слайдеры "что если" с мгновенным пересчётом
- **AI-анализ** — полный отчёт + чат по данным (Claude Sonnet)
- **PDF-отчёт** — скачать одним кликом
- **Импорт** — загрузка Excel/CSV файлов

---

## Деплой на Railway (рекомендуется)

### 1. Подготовка репозитория

```bash
git clone <your-repo>
cd finscope
cp .env.example .env
# Заполните .env файл
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Создание проекта на Railway

1. Зайдите на [railway.app](https://railway.app) и войдите через GitHub
2. Нажмите **New Project → Deploy from GitHub repo**
3. Выберите ваш репозиторий

### 3. Добавление PostgreSQL

В проекте Railway:
1. Нажмите **+ New Service → Database → PostgreSQL**
2. Railway автоматически создаст `DATABASE_URL` в переменных окружения

### 4. Деплой бэкенда

1. В Railway нажмите **+ New Service → GitHub Repo**
2. Выберите репозиторий
3. Укажите **Root Directory**: `backend`
4. Перейдите в **Settings → Variables** и добавьте:

```
SECRET_KEY=<сгенерируйте: openssl rand -hex 32>
ANTHROPIC_API_KEY=sk-ant-ваш-ключ
CORS_ORIGINS=https://ваш-фронтенд.up.railway.app
```

5. Railway автоматически подхватит `DATABASE_URL` из PostgreSQL сервиса

### 5. Деплой фронтенда

1. В Railway нажмите **+ New Service → GitHub Repo**
2. Выберите тот же репозиторий
3. Укажите **Root Directory**: `frontend`
4. Добавьте переменную:

```
VITE_API_URL=https://ваш-бэкенд.up.railway.app/api
```

### 6. Проверка

- Бэкенд: `https://ваш-бэкенд.up.railway.app/api/health` → `{"status":"ok"}`
- Фронтенд: откройте URL фронтенда, зарегистрируйтесь

---

## Локальный запуск

### Через Docker Compose (рекомендуется)

```bash
cp .env.example .env
# Заполните ANTHROPIC_API_KEY в .env

docker compose up --build
```

Приложение доступно на `http://localhost`

### Без Docker

**Бэкенд:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Нужна PostgreSQL база данных
export DATABASE_URL=postgresql://user:pass@localhost:5432/finscope
export SECRET_KEY=dev_secret
export ANTHROPIC_API_KEY=sk-ant-...

uvicorn main:app --reload --port 8000
```

**Фронтенд:**
```bash
cd frontend
npm install
npm run dev
# Открыть http://localhost:5173
```

---

## Структура проекта

```
finscope/
├── backend/
│   ├── main.py          # FastAPI приложение, все эндпоинты
│   ├── models.py        # SQLAlchemy модели (Company, User, Period, Financials)
│   ├── calculations.py  # Движок расчёта коэффициентов
│   ├── ai_service.py    # Интеграция с Claude API
│   ├── pdf_generator.py # Генерация PDF отчётов
│   ├── file_parser.py   # Парсинг Excel/CSV
│   ├── auth.py          # JWT авторизация
│   ├── schemas.py       # Pydantic схемы
│   ├── database.py      # Подключение к БД
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PulseTab.jsx     # Пульс компании
│   │   │   ├── PnlTab.jsx       # ОПУ и водопад
│   │   │   ├── RatiosTab.jsx    # Коэффициенты + радар
│   │   │   ├── CashflowTab.jsx  # Кэш-флоу и FCF
│   │   │   ├── DynamicsTab.jsx  # Динамика периодов
│   │   │   ├── ScenariosTab.jsx # Сценарный анализ
│   │   │   ├── AITab.jsx        # AI анализ и чат
│   │   │   ├── InputTab.jsx     # Ввод данных / загрузка
│   │   │   ├── Header.jsx       # Шапка с выбором периода
│   │   │   └── ui.jsx           # Общие компоненты
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   ├── store.js     # Zustand store + axios
│   │   └── App.jsx      # Роутинг
│   └── package.json
├── nginx/nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/health` | Статус сервера |
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| GET | `/api/auth/me` | Текущий пользователь |
| GET | `/api/company` | Данные компании |
| GET | `/api/periods` | Список периодов с метриками |
| POST | `/api/periods` | Создать период |
| PUT | `/api/periods/{id}` | Обновить период |
| DELETE | `/api/periods/{id}` | Удалить период |
| GET | `/api/periods/{id}/metrics` | Рассчитанные коэффициенты |
| GET | `/api/periods/{id}/pdf` | Скачать PDF отчёт |
| POST | `/api/ai/analysis` | AI анализ периода |
| POST | `/api/ai/chat` | Чат с AI по данным |
| POST | `/api/scenarios` | Сценарный расчёт |
| POST | `/api/import/preview` | Превью загружаемого файла |

---

## Расчётные коэффициенты

**Ликвидность:** текущая, быстрая, абсолютная

**Устойчивость:** автономия, долг/капитал, покрытие ВА, обеспеченность СОС

**Рентабельность:** ROS, ROE, ROA, ROIC, валовая маржа, EBIT маржа, модель Дюпона

**Деловая активность:** оборачиваемость активов, дни ДЗ, дни запасов, дни КЗ

**Кэш-флоу:** операционный, инвестиционный, финансовый CF, FCF

**Рейтинг:** 5-балльная шкала здоровья компании

---

## Следующие шаги (дорожная карта)

- [ ] Мультитенант — несколько компаний на одном аккаунте
- [ ] Роли пользователей — учредитель (только просмотр) и бухгалтер
- [ ] Экспорт в Excel
- [ ] Отраслевые бенчмарки для сравнения
- [ ] Email-рассылка отчётов
- [ ] Интеграция с 1С через API

---

## Лицензия

MIT
